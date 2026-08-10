import fs from 'node:fs';

const fail = (message) => {
  console.error(`ATLAS production config: ${message}`);
  process.exitCode = 1;
};

const raw = fs.readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
const stripped = raw
  .replace(/^\uFEFF/, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

let config;
try {
  config = JSON.parse(stripped);
} catch (error) {
  fail(`wrangler.jsonc is not valid JSONC for this validator: ${error.message}`);
  process.exit();
}

if (config.name !== 'atlas-enterprise-suite') fail('Worker name must remain atlas-enterprise-suite.');
if (config.main !== 'worker/router.js') fail('Worker entry point must be worker/router.js.');
if (!fs.existsSync(new URL('../worker/router.js', import.meta.url))) fail('worker/router.js is missing.');
if (!fs.existsSync(new URL('../worker/index.js', import.meta.url))) fail('worker/index.js is missing.');
if (!fs.existsSync(new URL('../worker/documents.js', import.meta.url))) fail('worker/documents.js is missing.');
if (config.assets?.binding !== 'ASSETS') fail('Static assets binding ASSETS is required.');
if (config.assets?.run_worker_first !== true) fail('run_worker_first must be true so API routes cannot be bypassed by assets.');

const databases = Array.isArray(config.d1_databases) ? config.d1_databases : [];
const db = databases.find((entry) => entry?.binding === 'DB');
if (!db) {
  fail('D1 binding DB is missing.');
} else {
  if (!String(db.database_name || '').trim()) fail('D1 database_name is missing. Configure the real Cloudflare database name; do not invent one.');
  const databaseId = String(db.database_id || '').trim();
  if (!databaseId) {
    fail('D1 database_id is missing. Configure the real Cloudflare D1 UUID; do not invent one.');
  } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(databaseId)) {
    fail('D1 database_id must be a valid UUID.');
  }
  if (db.migrations_dir !== 'migrations') fail('D1 migrations_dir must be migrations.');
}

if (!process.exitCode) console.log('ATLAS Cloudflare production configuration is structurally ready.');
