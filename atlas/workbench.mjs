import { access, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { basename, dirname, relative, resolve, sep } from 'node:path';

const ROOT = resolve(process.cwd());
const STATE = resolve(ROOT, '.atlas', 'workbench');
await mkdir(STATE, { recursive: true });

const DENIED_SEGMENTS = new Set(['.git', 'node_modules', '.wrangler']);
const DENIED_PREFIXES = ['.env', '.dev.vars'];
const SKIP_DIRS = new Set(['.git', 'node_modules', '.wrangler', '.atlas']);
const TEXT_LIMIT = 2_000_000;

function json(value, code = 0) {
  console.log(JSON.stringify(value, null, 2));
  process.exitCode = code;
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function parseArgs(values) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (!v.startsWith('--')) {
      positional.push(v);
      continue;
    }
    const key = v.slice(2);
    const next = values[i + 1];
    if (next && !next.startsWith('--')) {
      flags[key] = next;
      i++;
    } else {
      flags[key] = true;
    }
  }
  return { positional, flags };
}

function safePath(input = '.') {
  const raw = String(input || '.').replace(/\\/g, '/');
  const parts = raw.split('/').filter(Boolean);
  for (const part of parts) {
    if (DENIED_SEGMENTS.has(part) || DENIED_PREFIXES.some((p) => part === p || part.startsWith(`${p}.`))) {
      throw new Error(`Path is blocked by ATLAS Workbench policy: ${part}`);
    }
  }
  const abs = resolve(ROOT, raw);
  if (abs !== ROOT && !abs.startsWith(`${ROOT}${sep}`)) throw new Error('Path escapes the ATLAS workspace');
  return abs;
}

function rel(abs) {
  const r = relative(ROOT, abs).replace(/\\/g, '/');
  return r || '.';
}

async function exists(abs) {
  try {
    await access(abs);
    return true;
  } catch {
    return false;
  }
}

async function listTree(start = '.', depth = 2) {
  const root = safePath(start);
  const out = [];
  async function walk(dir, level) {
    if (level > depth) return;
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (SKIP_DIRS.has(entry.name) || DENIED_PREFIXES.some((p) => entry.name === p || entry.name.startsWith(`${p}.`))) continue;
      const abs = resolve(dir, entry.name);
      const info = { path: rel(abs), type: entry.isDirectory() ? 'directory' : 'file' };
      if (entry.isFile()) info.bytes = (await stat(abs)).size;
      out.push(info);
      if (entry.isDirectory()) await walk(abs, level + 1);
    }
  }
  const s = await stat(root);
  if (s.isFile()) return [{ path: rel(root), type: 'file', bytes: s.size }];
  await walk(root, 0);
  return out;
}

async function readText(path, startLine = 1, endLine = null) {
  const abs = safePath(path);
  const s = await stat(abs);
  if (!s.isFile()) throw new Error('Target is not a file');
  if (s.size > TEXT_LIMIT) throw new Error(`File exceeds ${TEXT_LIMIT} byte text-read limit`);
  const text = await readFile(abs, 'utf8');
  const lines = text.split(/\r?\n/);
  const start = Math.max(1, Number(startLine) || 1);
  const end = Math.min(lines.length, endLine ? Number(endLine) : lines.length);
  return {
    path: rel(abs),
    startLine: start,
    endLine: end,
    totalLines: lines.length,
    content: lines.slice(start - 1, end).join('\n'),
  };
}

async function grep(pattern, start = '.', { regex = false, caseSensitive = false, limit = 200 } = {}) {
  const target = safePath(start);
  const files = [];
  const s = await stat(target);
  if (s.isFile()) files.push(target);
  else {
    const tree = await listTree(start, 20);
    for (const item of tree) if (item.type === 'file' && item.bytes <= TEXT_LIMIT) files.push(safePath(item.path));
  }
  const flags = caseSensitive ? 'g' : 'gi';
  const rx = regex ? new RegExp(pattern, flags) : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
  const results = [];
  for (const file of files) {
    let text;
    try { text = await readFile(file, 'utf8'); } catch { continue; }
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      rx.lastIndex = 0;
      if (!rx.test(lines[i])) continue;
      results.push({ path: rel(file), line: i + 1, text: lines[i].slice(0, 500) });
      if (results.length >= limit) return { pattern, truncated: true, results };
    }
  }
  return { pattern, truncated: false, results };
}

async function inputText(flags) {
  if (typeof flags.content === 'string') return flags.content;
  if (typeof flags.from === 'string') return readFile(safePath(flags.from), 'utf8');
  if (flags.stdin) {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    return Buffer.concat(chunks.map((c) => Buffer.isBuffer(c) ? c : Buffer.from(c))).toString('utf8');
  }
  throw new Error('Provide --content, --from, or --stdin');
}

async function writeText(path, content, { apply = false, overwrite = false } = {}) {
  const abs = safePath(path);
  const present = await exists(abs);
  if (present && !overwrite) throw new Error('Target exists. Pass --overwrite to replace it.');
  const before = present ? await readFile(abs, 'utf8') : '';
  const preview = {
    operation: present ? 'overwrite' : 'create',
    path: rel(abs),
    apply,
    beforeSha256: present ? hash(before) : null,
    afterSha256: hash(content),
    bytes: Buffer.byteLength(content),
  };
  if (apply) {
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, content, 'utf8');
  }
  return preview;
}

async function replaceText(path, oldText, newText, { apply = false, all = false } = {}) {
  const abs = safePath(path);
  const before = await readFile(abs, 'utf8');
  const count = before.split(oldText).length - 1;
  if (count === 0) throw new Error('old_text was not found');
  if (count > 1 && !all) throw new Error(`old_text matched ${count} times. Pass --all to replace every occurrence.`);
  const after = all ? before.split(oldText).join(newText) : before.replace(oldText, newText);
  if (apply) await writeFile(abs, after, 'utf8');
  return {
    operation: 'replace',
    path: rel(abs),
    matches: count,
    replaced: all ? count : 1,
    apply,
    beforeSha256: hash(before),
    afterSha256: hash(after),
  };
}

async function runScript(name, extra = [], { apply = false } = {}) {
  const pkg = JSON.parse(await readFile(resolve(ROOT, 'package.json'), 'utf8'));
  if (!pkg.scripts?.[name]) throw new Error(`Unknown npm script: ${name}`);
  const risky = /deploy|release|rollback|promote|secret|publish/i.test(name);
  if (risky && !apply) {
    return { script: name, command: pkg.scripts[name], apply: false, blocked: true, reason: 'Risky scripts require --apply' };
  }
  const result = spawnSync('npm', ['run', name, ...(extra.length ? ['--', ...extra] : [])], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env, ATLAS_WORKBENCH: '1' },
  });
  return {
    script: name,
    apply: true,
    status: result.status,
    ok: result.status === 0,
    stdout: (result.stdout || '').slice(-20000),
    stderr: (result.stderr || '').slice(-20000),
  };
}

function slugify(value) {
  return String(value || 'module')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'module';
}

function pascal(slug) {
  return slug.split('-').filter(Boolean).map((p) => p[0].toUpperCase() + p.slice(1)).join('');
}

function scaffoldFiles(name, description = '') {
  const slug = slugify(name);
  const symbol = pascal(slug);
  const title = String(name || slug).trim();
  const desc = description || `${title} module generated by ATLAS Workbench.`;
  const worker = `const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};\nconst HTML_HEADERS={'content-type':'text/html; charset=utf-8','cache-control':'no-store'};\n\nexport function handle${symbol}(request){\n  const url=new URL(request.url);\n  if(url.pathname==='/api/${slug}/status') return new Response(JSON.stringify({ok:true,service:${JSON.stringify(title)},generatedBy:'ATLAS Workbench'}),{headers:JSON_HEADERS});\n  if(url.pathname!=='/${slug}') return null;\n  const html=\`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{margin:0;background:#050a13;color:#f4f7fb;font:15px Inter,system-ui,sans-serif}.wrap{max-width:980px;margin:auto;padding:56px 24px}.card{border:1px solid #23425f;background:#0a1727;border-radius:18px;padding:24px}small{color:#67d5ff;letter-spacing:.12em}h1{font-size:42px;margin:10px 0}p{color:#9eb2c5;line-height:1.6}</style></head><body><main class="wrap"><section class="card"><small>ATLAS WORKBENCH MODULE</small><h1>${title}</h1><p>${desc.replace(/`/g, '\\`')}</p><p>This scaffold contains no fabricated operational data. Connect an authorized ATLAS data source before rendering records.</p></section></main></body></html>\`;\n  return new Response(html,{headers:HTML_HEADERS});\n}\n`;
  const validator = `import assert from 'node:assert/strict';\nimport {handle${symbol}} from '../modules/${slug}-worker.js';\nconst status=handle${symbol}(new Request('https://atlas.local/api/${slug}/status'));\nassert.ok(status);\nassert.equal(status.status,200);\nconst body=await status.json();\nassert.equal(body.ok,true);\nconst page=handle${symbol}(new Request('https://atlas.local/${slug}'));\nassert.ok(page);\nassert.equal(page.status,200);\nassert.match(await page.text(),/${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/);\nassert.equal(handle${symbol}(new Request('https://atlas.local/unrelated')),null);\nconsole.log('${title} scaffold validation passed.');\n`;
  const manifest = JSON.stringify({
    id: slug,
    title,
    description: desc,
    handler: `handle${symbol}`,
    route: `/${slug}`,
    statusRoute: `/api/${slug}/status`,
    generatedBy: 'ATLAS Workbench',
  }, null, 2) + '\n';
  return {
    slug,
    files: {
      [`modules/${slug}-worker.js`]: worker,
      [`scripts/validate-${slug}.mjs`]: validator,
      [`modules/${slug}.atlas.json`]: manifest,
    },
    routerSnippet: `import {handle${symbol}} from './modules/${slug}-worker.js';\n// inside fetch(): const ${slug.replace(/-/g, '_')}=handle${symbol}(request,env,ctx); if(${slug.replace(/-/g, '_')}) return ${slug.replace(/-/g, '_')};`,
    packageScript: `\"check:${slug}\": \"node scripts/validate-${slug}.mjs\"`,
  };
}

async function scaffold(name, description, apply = false) {
  const plan = scaffoldFiles(name, description);
  const outputs = [];
  for (const [path, content] of Object.entries(plan.files)) {
    outputs.push(await writeText(path, content, { apply, overwrite: false }));
  }
  return { ...plan, files: outputs, apply };
}

const [domain, action, ...raw] = process.argv.slice(2);
const { positional, flags } = parseArgs(raw);

try {
  if (domain === 'fs' && action === 'list') {
    json({ service: 'ATLAS Workbench', tool: 'fs.list', entries: await listTree(positional[0] || '.', Number(flags.depth || positional[1] || 2)) });
  } else if (domain === 'fs' && action === 'read') {
    json(await readText(positional[0], flags.start || positional[1] || 1, flags.end || positional[2] || null));
  } else if (domain === 'fs' && action === 'grep') {
    json(await grep(positional[0] || '', positional[1] || '.', {
      regex: Boolean(flags.regex),
      caseSensitive: Boolean(flags.case),
      limit: Number(flags.limit || 200),
    }));
  } else if (domain === 'fs' && action === 'write') {
    const content = await inputText(flags);
    json(await writeText(positional[0], content, { apply: Boolean(flags.apply), overwrite: Boolean(flags.overwrite) }));
  } else if (domain === 'fs' && action === 'replace') {
    const oldText = typeof flags.old === 'string' ? flags.old : null;
    const newText = typeof flags.new === 'string' ? flags.new : '';
    if (oldText === null) throw new Error('Provide --old and --new');
    json(await replaceText(positional[0], oldText, newText, { apply: Boolean(flags.apply), all: Boolean(flags.all) }));
  } else if (domain === 'task' && action === 'run') {
    const result = await runScript(positional[0], positional.slice(1), { apply: Boolean(flags.apply) });
    json(result, result.ok === false ? 1 : 0);
  } else if (domain === 'app' && action === 'scaffold') {
    json(await scaffold(positional[0], flags.description || positional.slice(1).join(' '), Boolean(flags.apply)));
  } else if (domain === 'status') {
    const pkg = JSON.parse(await readFile(resolve(ROOT, 'package.json'), 'utf8'));
    json({
      service: 'ATLAS Sovereign Workbench',
      version: 1,
      root: basename(ROOT),
      tools: ['fs.list', 'fs.read', 'fs.grep', 'fs.write', 'fs.replace', 'task.run', 'app.scaffold'],
      safety: { pathBoundary: true, secretPathBlocking: true, writesDryRunByDefault: true, riskyTasksRequireApply: true },
      npmScripts: Object.keys(pkg.scripts || {}).sort(),
    });
  } else {
    console.error(`ATLAS Sovereign Workbench\n\nUsage:\n  node atlas/workbench.mjs status\n  node atlas/workbench.mjs fs list [path] [--depth N]\n  node atlas/workbench.mjs fs read <path> [--start N] [--end N]\n  node atlas/workbench.mjs fs grep <pattern> [path] [--regex] [--case] [--limit N]\n  node atlas/workbench.mjs fs write <path> (--content TEXT|--from PATH|--stdin) [--overwrite] [--apply]\n  node atlas/workbench.mjs fs replace <path> --old TEXT --new TEXT [--all] [--apply]\n  node atlas/workbench.mjs task run <npm-script> [args...] [--apply]\n  node atlas/workbench.mjs app scaffold <name> [--description TEXT] [--apply]\n\nWrites are previews unless --apply is provided. Secret-like paths are blocked.`);
    process.exitCode = 2;
  }
} catch (error) {
  json({ service: 'ATLAS Workbench', ok: false, error: error instanceof Error ? error.message : String(error) }, 1);
}
