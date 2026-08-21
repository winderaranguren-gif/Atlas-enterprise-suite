import { access, copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, relative, resolve, sep } from 'node:path';

const ROOT = resolve(process.cwd());
const FORGE = resolve(ROOT, '.atlas', 'forge');
await mkdir(FORGE, { recursive: true });

const SKIP = new Set(['.git', 'node_modules', '.wrangler', '.atlas']);
const SECRET_PREFIXES = ['.env', '.dev.vars'];
const [cmd, ...raw] = process.argv.slice(2);
const apply = raw.includes('--apply');
const prune = raw.includes('--prune');
const args = raw.filter((v) => !v.startsWith('--'));

const safe = (s) => String(s || '').replace(/[^a-z0-9._-]/gi, '_');
const rel = (p) => relative(ROOT, p).replace(/\\/g, '/');
const shaBuffer = (b) => createHash('sha256').update(b).digest('hex');

function safeRootPath(path) {
  const abs = resolve(ROOT, path);
  if (abs !== ROOT && !abs.startsWith(`${ROOT}${sep}`)) throw new Error('Path escapes workspace');
  return abs;
}

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

async function workspaceFiles() {
  const out = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (SKIP.has(entry.name) || SECRET_PREFIXES.some((p) => entry.name === p || entry.name.startsWith(`${p}.`))) continue;
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) await walk(abs);
      else if (entry.isFile()) out.push(abs);
    }
  }
  await walk(ROOT);
  return out.sort((a, b) => rel(a).localeCompare(rel(b)));
}

async function manifest(name = 'workspace') {
  const files = {};
  for (const abs of await workspaceFiles()) {
    const buf = await readFile(abs);
    const info = await stat(abs);
    files[rel(abs)] = { sha256: shaBuffer(buf), bytes: info.size };
  }
  return { name, createdAt: new Date().toISOString(), fileCount: Object.keys(files).length, files };
}

async function snapshot(name) {
  const id = safe(name || new Date().toISOString());
  const dir = join(FORGE, id);
  const filesDir = join(dir, 'files');
  if (await exists(dir)) throw new Error(`Checkpoint already exists: ${id}`);
  await mkdir(filesDir, { recursive: true });
  const m = await manifest(id);
  for (const path of Object.keys(m.files)) {
    const src = safeRootPath(path);
    const dst = join(filesDir, path);
    await mkdir(dirname(dst), { recursive: true });
    await copyFile(src, dst);
  }
  await writeFile(join(dir, 'manifest.json'), JSON.stringify(m, null, 2) + '\n', 'utf8');
  return m;
}

async function checkpointManifest(name) {
  const id = safe(name);
  try { return JSON.parse(await readFile(join(FORGE, id, 'manifest.json'), 'utf8')); }
  catch { throw new Error(`Checkpoint not found: ${id}`); }
}

async function diff(name) {
  const before = await checkpointManifest(name);
  const now = await manifest('workspace');
  const oldPaths = new Set(Object.keys(before.files || {}));
  const newPaths = new Set(Object.keys(now.files || {}));
  const added = [...newPaths].filter((p) => !oldPaths.has(p)).sort();
  const removed = [...oldPaths].filter((p) => !newPaths.has(p)).sort();
  const changed = [...newPaths].filter((p) => oldPaths.has(p) && now.files[p].sha256 !== before.files[p].sha256).sort();
  return { checkpoint: before.name, added, removed, changed, clean: !added.length && !removed.length && !changed.length };
}

async function restore(name) {
  const m = await checkpointManifest(name);
  const id = safe(name);
  const d = await diff(name);
  const plan = {
    checkpoint: id,
    apply,
    prune,
    restore: [...d.changed, ...d.removed].sort(),
    removeAdded: prune ? d.added : [],
    preservedAdded: prune ? [] : d.added,
  };
  if (!apply) return plan;
  const filesDir = join(FORGE, id, 'files');
  for (const path of plan.restore) {
    const source = join(filesDir, path);
    if (!(await exists(source))) continue;
    const target = safeRootPath(path);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target);
  }
  if (prune) for (const path of plan.removeAdded) await rm(safeRootPath(path), { force: true });
  return { ...plan, restoredAt: new Date().toISOString() };
}

try {
  if (cmd === 'snapshot' || cmd === 'create') console.log(JSON.stringify(await snapshot(args[0]), null, 2));
  else if (cmd === 'list') {
    const names = [];
    for (const entry of await readdir(FORGE, { withFileTypes: true })) if (entry.isDirectory()) names.push(entry.name);
    console.log(JSON.stringify(names.sort().reverse(), null, 2));
  } else if (cmd === 'inspect') {
    console.log(JSON.stringify(args[0] ? await checkpointManifest(args[0]) : await manifest('workspace'), null, 2));
  } else if (cmd === 'diff') console.log(JSON.stringify(await diff(args[0]), null, 2));
  else if (cmd === 'restore') console.log(JSON.stringify(await restore(args[0]), null, 2));
  else {
    console.error('Usage: forge snapshot [name] | forge list | forge inspect [name] | forge diff <name> | forge restore <name> [--apply] [--prune]');
    process.exitCode = 2;
  }
} catch (error) {
  console.error(JSON.stringify({ service: 'ATLAS Forge', ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exitCode = 1;
}
