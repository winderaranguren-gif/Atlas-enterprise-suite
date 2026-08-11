import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const generated = new URL('../wrangler.production.jsonc', import.meta.url);
const env = {
  ...process.env,
  ATLAS_D1_DATABASE_NAME: 'atlas-ci-contract',
  ATLAS_D1_DATABASE_ID: '123e4567-e89b-42d3-a456-426614174000',
  ATLAS_BACKUPS_BUCKET_NAME: 'atlas-ci-contract-backups',
  ATLAS_DEPLOYED_SHA: '0123456789abcdef0123456789abcdef01234567',
};

try {
  execFileSync(process.execPath, ['scripts/prepare-cloudflare-production.mjs'], {
    cwd: root,
    env,
    stdio: 'pipe',
  });

  const config = JSON.parse(fs.readFileSync(generated, 'utf8'));
  const db = config.d1_databases?.find((item) => item.binding === 'DB');
  const backups = config.r2_buckets?.find((item) => item.binding === 'BACKUPS');

  if (config.main !== 'worker/router.js') throw new Error('Generated config lost worker/router.js entrypoint');
  if (config.assets?.binding !== 'ASSETS' || config.assets?.run_worker_first !== true) throw new Error('Generated config lost protected ASSETS routing');
  if (!db || db.database_name !== env.ATLAS_D1_DATABASE_NAME || db.database_id !== env.ATLAS_D1_DATABASE_ID || db.migrations_dir !== 'migrations') {
    throw new Error('Generated config does not bind D1 DB correctly');
  }
  if (!backups || backups.bucket_name !== env.ATLAS_BACKUPS_BUCKET_NAME) throw new Error('Generated config does not bind R2 BACKUPS correctly');
  if (config.vars?.ATLAS_DEPLOYED_SHA !== env.ATLAS_DEPLOYED_SHA) throw new Error('Generated config does not pin exact deployed SHA');
  if (JSON.stringify(config).includes('ATLAS_BOOTSTRAP_TOKEN')) throw new Error('Bootstrap secret must never be written into generated config');

  console.log('Cloudflare production config generation contract passed.');
} finally {
  if (fs.existsSync(generated)) fs.unlinkSync(generated);
}
