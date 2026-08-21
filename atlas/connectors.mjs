import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const DIR = resolve(ROOT, '.atlas', 'connectors');
const FILE = resolve(DIR, 'registry.json');
await mkdir(DIR, { recursive: true });

const BUILT_INS = [
  { id: 'github', name: 'GitHub', auth: 'token', env: ['GITHUB_TOKEN'], capabilities: ['repositories', 'files', 'branches', 'pull_requests', 'issues', 'actions'] },
  { id: 'cloudflare', name: 'Cloudflare', auth: 'api_token', env: ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'], capabilities: ['workers', 'routes', 'durable_objects', 'realtime_turn'] },
  { id: 'openai', name: 'OpenAI', auth: 'api_key', env: ['OPENAI_API_KEY'], capabilities: ['generation', 'agents', 'embeddings'] },
  { id: 'google', name: 'Google Workspace', auth: 'oauth2', env: [], capabilities: ['gmail', 'calendar', 'drive', 'contacts'] },
  { id: 'microsoft', name: 'Microsoft 365', auth: 'oauth2', env: [], capabilities: ['outlook', 'teams', 'sharepoint'] },
  { id: 'slack', name: 'Slack', auth: 'oauth2', env: [], capabilities: ['channels', 'messages', 'search'] },
];

function out(value, code = 0) {
  console.log(JSON.stringify(value, null, 2));
  process.exitCode = code;
}

function safeId(value) {
  const id = String(value || '').toLowerCase().trim();
  if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(id)) throw new Error('Connector id must be 1-63 lowercase letters, numbers, _ or -');
  return id;
}

function parse(values) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < values.length; i++) {
    if (!values[i].startsWith('--')) { positional.push(values[i]); continue; }
    const key = values[i].slice(2);
    const next = values[i + 1];
    if (next && !next.startsWith('--')) flags[key] = values[++i];
    else flags[key] = true;
  }
  return { positional, flags };
}

async function load() {
  try {
    const data = JSON.parse(await readFile(FILE, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

async function save(rows) {
  await writeFile(FILE, JSON.stringify(rows.sort((a, b) => a.id.localeCompare(b.id)), null, 2) + '\n', 'utf8');
}

function normalize(def) {
  return {
    id: safeId(def.id),
    name: String(def.name || def.id),
    auth: String(def.auth || 'none'),
    env: Array.from(new Set(Array.isArray(def.env) ? def.env.map(String) : [])),
    capabilities: Array.from(new Set(Array.isArray(def.capabilities) ? def.capabilities.map(String) : [])),
    endpoint: def.endpoint ? String(def.endpoint) : null,
    notes: def.notes ? String(def.notes) : null,
    source: def.source || 'custom',
    updatedAt: new Date().toISOString(),
  };
}

function readiness(connector) {
  const checks = (connector.env || []).map((name) => ({ name, configured: Boolean(process.env[name]) }));
  const oauth = connector.auth === 'oauth2';
  const ready = oauth ? null : checks.every((c) => c.configured);
  return {
    ...connector,
    readiness: oauth ? 'authorization-required-at-runtime' : ready ? 'configured' : 'missing-environment',
    envChecks: checks,
  };
}

const [cmd, ...raw] = process.argv.slice(2);
const { positional, flags } = parse(raw);

try {
  const custom = await load();
  const merged = [...BUILT_INS.map((x) => normalize({ ...x, source: 'built-in' })), ...custom]
    .reduce((map, item) => map.set(item.id, item), new Map());

  if (cmd === 'list') {
    out({ service: 'ATLAS Connectors', connectors: [...merged.values()].map(readiness) });
  } else if (cmd === 'status') {
    const id = positional[0] ? safeId(positional[0]) : null;
    if (id) {
      const item = merged.get(id);
      if (!item) throw new Error(`Unknown connector: ${id}`);
      out(readiness(item));
    } else {
      const rows = [...merged.values()].map(readiness);
      out({
        service: 'ATLAS Connectors',
        total: rows.length,
        configured: rows.filter((r) => r.readiness === 'configured').length,
        oauthRuntime: rows.filter((r) => r.readiness === 'authorization-required-at-runtime').length,
        missingEnvironment: rows.filter((r) => r.readiness === 'missing-environment').length,
        connectors: rows,
      });
    }
  } else if (cmd === 'register') {
    const id = safeId(positional[0]);
    const definition = normalize({
      id,
      name: flags.name || id,
      auth: flags.auth || 'none',
      env: flags.env ? String(flags.env).split(',').map((v) => v.trim()).filter(Boolean) : [],
      capabilities: flags.capabilities ? String(flags.capabilities).split(',').map((v) => v.trim()).filter(Boolean) : [],
      endpoint: flags.endpoint || null,
      notes: flags.notes || null,
      source: 'custom',
    });
    const next = custom.filter((c) => c.id !== id);
    next.push(definition);
    if (flags.apply) await save(next);
    out({ operation: custom.some((c) => c.id === id) ? 'replace' : 'register', apply: Boolean(flags.apply), connector: readiness(definition) });
  } else if (cmd === 'remove') {
    const id = safeId(positional[0]);
    const before = custom.length;
    const next = custom.filter((c) => c.id !== id);
    const removed = before !== next.length;
    if (flags.apply) await save(next);
    out({ operation: 'remove', id, removed, apply: Boolean(flags.apply) });
  } else if (cmd === 'catalog') {
    out({
      service: 'ATLAS Connectors',
      builtIns: BUILT_INS,
      policy: {
        secretsStoredInRegistry: false,
        readinessChecksOnlyPresence: true,
        oauthTokensPersistedByThisTool: false,
        writesDryRunByDefault: true,
      },
    });
  } else {
    console.error(`ATLAS Connectors\n\nUsage:\n  node atlas/connectors.mjs catalog\n  node atlas/connectors.mjs list\n  node atlas/connectors.mjs status [id]\n  node atlas/connectors.mjs register <id> [--name NAME] [--auth TYPE] [--env A,B] [--capabilities A,B] [--endpoint URL] [--notes TEXT] [--apply]\n  node atlas/connectors.mjs remove <id> [--apply]\n\nThe registry stores metadata only. Secret values are never written by this tool.`);
    process.exitCode = 2;
  }
} catch (error) {
  out({ service: 'ATLAS Connectors', ok: false, error: error instanceof Error ? error.message : String(error) }, 1);
}
