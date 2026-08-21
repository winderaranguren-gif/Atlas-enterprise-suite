import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const BASE = resolve(ROOT, '.atlas', 'models');
const SCHEMAS = resolve(BASE, 'schemas');
const DATA = resolve(BASE, 'data');
await mkdir(SCHEMAS, { recursive: true });
await mkdir(DATA, { recursive: true });

const safeName = (value) => {
  const v = String(value || '');
  if (!/^\w{1,63}$/.test(v)) throw new Error('Entity/schema name must match ^\\w{1,63}$');
  return v;
};
const schemaPath = (name) => resolve(SCHEMAS, `${safeName(name)}.json`);
const dataPath = (name) => resolve(DATA, `${safeName(name)}.json`);

function output(value, code = 0) {
  console.log(JSON.stringify(value, null, 2));
  process.exitCode = code;
}

function parseArgs(values) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < values.length; i++) {
    if (!values[i].startsWith('--')) { positional.push(values[i]); continue; }
    const key = values[i].slice(2);
    if (values[i + 1] && !values[i + 1].startsWith('--')) flags[key] = values[++i];
    else flags[key] = true;
  }
  return { positional, flags };
}

function parseJson(value, label) {
  try { return JSON.parse(String(value)); }
  catch { throw new Error(`${label} must be valid JSON`); }
}

async function readSchema(name) {
  try { return JSON.parse(await readFile(schemaPath(name), 'utf8')); }
  catch { throw new Error(`Schema not found: ${name}`); }
}

async function readRows(name) {
  try {
    const value = JSON.parse(await readFile(dataPath(name), 'utf8'));
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

async function saveRows(name, rows) {
  await writeFile(dataPath(name), JSON.stringify(rows, null, 2) + '\n', 'utf8');
}

function typeOk(value, type) {
  if (value === null) return true;
  if (type === 'string') return typeof value === 'string';
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'boolean') return typeof value === 'boolean';
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return typeof value === 'object' && !Array.isArray(value);
  return true;
}

function validate(schema, record, { partial = false } = {}) {
  const properties = schema.properties || {};
  const required = new Set(schema.required || []);
  const errors = [];
  if (!partial) for (const key of required) if (!(key in record)) errors.push(`${key} is required`);
  for (const [key, value] of Object.entries(record)) {
    if (['id', 'createdAt', 'updatedAt'].includes(key)) continue;
    const def = properties[key];
    if (!def) {
      if (schema.additionalProperties === false) errors.push(`${key} is not allowed`);
      continue;
    }
    if (def.type && !typeOk(value, def.type)) errors.push(`${key} must be ${def.type}`);
    if (typeof value === 'string' && def.minLength && value.length < def.minLength) errors.push(`${key} is shorter than minLength`);
    if (typeof value === 'string' && def.maxLength && value.length > def.maxLength) errors.push(`${key} exceeds maxLength`);
    if (typeof value === 'number' && def.minimum !== undefined && value < def.minimum) errors.push(`${key} is below minimum`);
    if (typeof value === 'number' && def.maximum !== undefined && value > def.maximum) errors.push(`${key} exceeds maximum`);
    if (Array.isArray(def.enum) && !def.enum.includes(value)) errors.push(`${key} must be one of enum values`);
  }
  return errors;
}

function compare(actual, condition) {
  if (!condition || typeof condition !== 'object' || Array.isArray(condition)) return actual === condition;
  for (const [op, expected] of Object.entries(condition)) {
    if (op === '$eq' && actual !== expected) return false;
    if (op === '$ne' && actual === expected) return false;
    if (op === '$gt' && !(actual > expected)) return false;
    if (op === '$gte' && !(actual >= expected)) return false;
    if (op === '$lt' && !(actual < expected)) return false;
    if (op === '$lte' && !(actual <= expected)) return false;
    if (op === '$in' && (!Array.isArray(expected) || !expected.includes(actual))) return false;
    if (op === '$nin' && Array.isArray(expected) && expected.includes(actual)) return false;
  }
  return true;
}

function matches(row, query = {}) {
  if ('$and' in query) return Array.isArray(query.$and) && query.$and.every((q) => matches(row, q));
  if ('$or' in query) return Array.isArray(query.$or) && query.$or.some((q) => matches(row, q));
  return Object.entries(query).every(([key, condition]) => {
    if (key.startsWith('$')) return true;
    return compare(row[key], condition);
  });
}

function applyPatch(row, patch) {
  const next = { ...row };
  if (patch.$set && typeof patch.$set === 'object') Object.assign(next, patch.$set);
  if (patch.$unset && typeof patch.$unset === 'object') for (const key of Object.keys(patch.$unset)) delete next[key];
  if (patch.$inc && typeof patch.$inc === 'object') for (const [key, n] of Object.entries(patch.$inc)) next[key] = Number(next[key] || 0) + Number(n);
  if (patch.$rename && typeof patch.$rename === 'object') for (const [from, to] of Object.entries(patch.$rename)) { if (from in next) { next[to] = next[from]; delete next[from]; } }
  next.updatedAt = new Date().toISOString();
  return next;
}

async function listSchemas() {
  const files = (await readdir(SCHEMAS)).filter((f) => f.endsWith('.json')).sort();
  const schemas = [];
  for (const file of files) {
    const schema = JSON.parse(await readFile(resolve(SCHEMAS, file), 'utf8'));
    schemas.push({ name: file.slice(0, -5), fields: Object.keys(schema.properties || {}), required: schema.required || [] });
  }
  return schemas;
}

const [domain, action, ...raw] = process.argv.slice(2);
const { positional, flags } = parseArgs(raw);

try {
  if (domain === 'schema' && action === 'list') {
    output({ service: 'ATLAS Model Engine', schemas: await listSchemas() });
  } else if (domain === 'schema' && action === 'show') {
    output({ name: safeName(positional[0]), schema: await readSchema(positional[0]) });
  } else if (domain === 'schema' && action === 'define') {
    const name = safeName(positional[0]);
    const schema = parseJson(flags.json, '--json');
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) throw new Error('Schema must be a JSON object');
    if (!schema.type) schema.type = 'object';
    const preview = { name, path: `.atlas/models/schemas/${name}.json`, apply: Boolean(flags.apply), schema };
    if (flags.apply) await writeFile(schemaPath(name), JSON.stringify(schema, null, 2) + '\n', 'utf8');
    output(preview);
  } else if (domain === 'entity' && action === 'create') {
    const name = safeName(positional[0]);
    const schema = await readSchema(name);
    const data = parseJson(flags.data, '--data');
    const records = Array.isArray(data) ? data : [data];
    const rows = await readRows(name);
    const now = new Date().toISOString();
    const created = records.map((record) => {
      const errors = validate(schema, record);
      if (errors.length) throw new Error(`Validation failed: ${errors.join('; ')}`);
      return { ...record, id: record.id || randomUUID(), createdAt: record.createdAt || now, updatedAt: now };
    });
    if (flags.apply) await saveRows(name, [...rows, ...created]);
    output({ entity: name, apply: Boolean(flags.apply), created });
  } else if (domain === 'entity' && action === 'query') {
    const name = safeName(positional[0]);
    await readSchema(name);
    const query = flags.query ? parseJson(flags.query, '--query') : {};
    const limit = Math.max(1, Math.min(500, Number(flags.limit || 50)));
    const skip = Math.max(0, Number(flags.skip || 0));
    const rows = (await readRows(name)).filter((row) => matches(row, query));
    output({ entity: name, count: rows.length, skip, limit, records: rows.slice(skip, skip + limit) });
  } else if (domain === 'entity' && action === 'update') {
    const name = safeName(positional[0]);
    const schema = await readSchema(name);
    const query = parseJson(flags.query, '--query');
    const patch = parseJson(flags.patch, '--patch');
    if (!Object.keys(patch).some((k) => ['$set', '$unset', '$inc', '$rename'].includes(k))) throw new Error('Patch requires $set, $unset, $inc, or $rename');
    const rows = await readRows(name);
    let matched = 0;
    const next = rows.map((row) => {
      if (!matches(row, query)) return row;
      matched++;
      const updated = applyPatch(row, patch);
      const errors = validate(schema, updated);
      if (errors.length) throw new Error(`Validation failed: ${errors.join('; ')}`);
      return updated;
    });
    if (flags.apply) await saveRows(name, next);
    output({ entity: name, matched, apply: Boolean(flags.apply), patch });
  } else if (domain === 'entity' && action === 'delete') {
    const name = safeName(positional[0]);
    await readSchema(name);
    const query = parseJson(flags.query, '--query');
    const rows = await readRows(name);
    const kept = rows.filter((row) => !matches(row, query));
    const deleted = rows.length - kept.length;
    if (flags.apply) await saveRows(name, kept);
    output({ entity: name, deleted, apply: Boolean(flags.apply) });
  } else if (domain === 'status') {
    output({
      service: 'ATLAS Model Engine',
      version: 1,
      storage: '.atlas/models',
      schemas: await listSchemas(),
      capabilities: ['schema.list', 'schema.show', 'schema.define', 'entity.create', 'entity.query', 'entity.update', 'entity.delete'],
      writesDryRunByDefault: true,
    });
  } else {
    console.error(`ATLAS Model Engine\n\nUsage:\n  node atlas/model-engine.mjs status\n  node atlas/model-engine.mjs schema list\n  node atlas/model-engine.mjs schema show <Entity>\n  node atlas/model-engine.mjs schema define <Entity> --json '{...}' [--apply]\n  node atlas/model-engine.mjs entity create <Entity> --data '{...}' [--apply]\n  node atlas/model-engine.mjs entity query <Entity> [--query '{...}'] [--limit N] [--skip N]\n  node atlas/model-engine.mjs entity update <Entity> --query '{...}' --patch '{\"$set\":{...}}' [--apply]\n  node atlas/model-engine.mjs entity delete <Entity> --query '{...}' [--apply]\n\nPersistent data is local to .atlas/models and is never committed by this tool.`);
    process.exitCode = 2;
  }
} catch (error) {
  output({ service: 'ATLAS Model Engine', ok: false, error: error instanceof Error ? error.message : String(error) }, 1);
}
