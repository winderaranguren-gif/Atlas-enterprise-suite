import fs from 'node:fs';

const required = {
  ATLAS_D1_DATABASE_NAME: process.env.ATLAS_D1_DATABASE_NAME,
  ATLAS_D1_DATABASE_ID: process.env.ATLAS_D1_DATABASE_ID,
  ATLAS_BACKUPS_BUCKET_NAME: process.env.ATLAS_BACKUPS_BUCKET_NAME,
  ATLAS_DEPLOYED_SHA: process.env.ATLAS_DEPLOYED_SHA,
};

for (const [name, value] of Object.entries(required)) {
  if (!String(value || '').trim()) throw new Error(`${name} is required`);
}

if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(required.ATLAS_D1_DATABASE_ID)) {
  throw new Error('ATLAS_D1_DATABASE_ID must be a valid UUID');
}
if (!/^[0-9a-f]{40}$/i.test(required.ATLAS_DEPLOYED_SHA)) {
  throw new Error('ATLAS_DEPLOYED_SHA must be the exact 40-character Git commit SHA');
}

const raw = fs.readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
const stripped = raw
  .replace(/^\uFEFF/, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
const config = JSON.parse(stripped);

if (config.main !== 'worker/router.js') throw new Error('Production entrypoint must be worker/router.js');
if (config.assets?.binding !== 'ASSETS' || config.assets?.run_worker_first !== true) {
  throw new Error('ASSETS binding with run_worker_first=true is required');
}

config.d1_databases = [{
  binding: 'DB',
  database_name: required.ATLAS_D1_DATABASE_NAME,
  database_id: required.ATLAS_D1_DATABASE_ID,
  migrations_dir: 'migrations',
}];
config.r2_buckets = [{
  binding: 'BACKUPS',
  bucket_name: required.ATLAS_BACKUPS_BUCKET_NAME,
}];
config.vars = {
  ...(config.vars || {}),
  ATLAS_DEPLOYED_SHA: required.ATLAS_DEPLOYED_SHA,
};

const output = new URL('../wrangler.production.jsonc', import.meta.url);
fs.writeFileSync(output, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
console.log('Generated wrangler.production.jsonc with D1, R2 and exact deployed SHA.');
