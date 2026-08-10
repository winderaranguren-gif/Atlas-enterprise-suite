import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const required = ['CLOUDFLARE_API_TOKEN','CLOUDFLARE_ACCOUNT_ID','ATLAS_CUSTOM_DOMAIN'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required deployment variable: ${key}`);
    process.exit(2);
  }
}

const DATABASE_NAME = process.env.ATLAS_D1_DATABASE_NAME || 'atlas-enterprise-suite';
const RUNTIME_CONFIG = '.wrangler.runtime.json';
const CONTROL_CONFIG = '.wrangler.control.json';

const source = JSON.parse(fs.readFileSync('wrangler.jsonc','utf8'));
const control = {
  name: `${source.name || 'atlas-enterprise-suite'}-control`,
  compatibility_date: source.compatibility_date || '2026-08-10'
};
fs.writeFileSync(CONTROL_CONFIG, `${JSON.stringify(control,null,2)}\n`);

function wrangler(args, { capture = true } = {}) {
  return execFileSync('npx', ['--yes','wrangler@4', ...args, '--config', CONTROL_CONFIG], {
    encoding: 'utf8',
    env: process.env,
    stdio: capture ? ['ignore','pipe','pipe'] : 'inherit'
  });
}

function listDatabases() {
  const raw = wrangler(['d1','list','--json']);
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : (parsed.result || []);
}

let db = listDatabases().find(item => item.name === DATABASE_NAME);
if (!db) {
  console.log(`Provisioning D1 database ${DATABASE_NAME}...`);
  wrangler(['d1','create',DATABASE_NAME], { capture: false });
  db = listDatabases().find(item => item.name === DATABASE_NAME);
}

const databaseId = db?.uuid || db?.id || db?.database_id;
if (!databaseId) {
  console.error(`Unable to resolve D1 database id for ${DATABASE_NAME}`);
  process.exit(3);
}

source.workers_dev = false;
source.routes = [{ pattern: process.env.ATLAS_CUSTOM_DOMAIN, custom_domain: true }];
source.d1_databases = [{
  binding: 'DB',
  database_name: DATABASE_NAME,
  database_id: databaseId,
  migrations_dir: 'migrations'
}];

fs.writeFileSync(RUNTIME_CONFIG, `${JSON.stringify(source,null,2)}\n`);
fs.rmSync(CONTROL_CONFIG,{force:true});
console.log(`Cloudflare production config generated for ${process.env.ATLAS_CUSTOM_DOMAIN}; D1 binding DB resolved.`);
