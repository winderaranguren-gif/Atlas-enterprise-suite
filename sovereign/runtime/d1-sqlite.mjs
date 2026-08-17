import { DatabaseSync } from 'node:sqlite';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

function normalize(value) {
  if (value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
}

function statementKind(sql) {
  const normalized = String(sql || '').trim().replace(/^--.*$/gm, '').trim().toUpperCase();
  if (/^(SELECT|PRAGMA|WITH\b.*\bSELECT)\b/s.test(normalized)) return 'read';
  return 'write';
}

class D1SQLitePreparedStatement {
  constructor(database, sql, values = []) {
    this.database = database;
    this.sql = String(sql || '');
    this.values = values.map(normalize);
  }

  bind(...values) {
    return new D1SQLitePreparedStatement(this.database, this.sql, values);
  }

  native() {
    return this.database.native.prepare(this.sql);
  }

  async first(column) {
    const row = this.native().get(...this.values);
    if (row === undefined) return null;
    if (column !== undefined) return row?.[column] ?? null;
    return row;
  }

  async all() {
    const results = this.native().all(...this.values);
    return { success: true, results, meta: { changes: 0 } };
  }

  async run() {
    const info = this.native().run(...this.values);
    return {
      success: true,
      meta: {
        changes: Number(info?.changes || 0),
        last_row_id: info?.lastInsertRowid === undefined ? null : Number(info.lastInsertRowid),
      },
    };
  }

  async raw(options = {}) {
    const rows = this.native().all(...this.values);
    if (options.columnNames) {
      const columns = rows.length ? Object.keys(rows[0]) : [];
      return [columns, ...rows.map((row) => columns.map((column) => row[column]))];
    }
    if (!rows.length) return [];
    const columns = Object.keys(rows[0]);
    return rows.map((row) => columns.map((column) => row[column]));
  }

  async executeForBatch() {
    return statementKind(this.sql) === 'read' ? this.all() : this.run();
  }
}

export class D1SQLiteDatabase {
  constructor(filename) {
    this.filename = path.resolve(filename);
    this.native = new DatabaseSync(this.filename);
    this.native.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  }

  static async open(filename) {
    const resolved = path.resolve(filename);
    await mkdir(path.dirname(resolved), { recursive: true });
    return new D1SQLiteDatabase(resolved);
  }

  prepare(sql) {
    return new D1SQLitePreparedStatement(this, sql);
  }

  async batch(statements) {
    if (!Array.isArray(statements)) throw new TypeError('D1 batch expects an array of prepared statements.');
    this.native.exec('BEGIN IMMEDIATE');
    try {
      const results = [];
      for (const statement of statements) {
        if (!(statement instanceof D1SQLitePreparedStatement) || statement.database !== this) {
          throw new TypeError('D1 batch received a statement from a different database.');
        }
        results.push(await statement.executeForBatch());
      }
      this.native.exec('COMMIT');
      return results;
    } catch (error) {
      try { this.native.exec('ROLLBACK'); } catch {}
      throw error;
    }
  }

  async exec(sql) {
    this.native.exec(String(sql || ''));
    return { count: 1, duration: 0 };
  }

  close() {
    this.native.close();
  }
}
