import fs from 'node:fs';

const required = [
  'ATLAS_D1_DATABASE_NAME',
  'ATLAS_D1_DATABASE_ID',
  'ATLAS_BACKUPS_BUCKET_NAME'
];

const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  console.error(`Missing required production bindings: ${missing.join(', ')}`);
  process.exit(1);
}

const source = fs.readFileSync('wrangler.toml', 'utf8');
const rendered = source
  .replace('REPLACE_WITH_ATLAS_D1_DATABASE_NAME', process.env.ATLAS_D1_DATABASE_NAME.trim())
  .replace('REPLACE_WITH_ATLAS_D1_DATABASE_ID', process.env.ATLAS_D1_DATABASE_ID.trim())
  .replace('REPLACE_WITH_ATLAS_BACKUPS_BUCKET_NAME', process.env.ATLAS_BACKUPS_BUCKET_NAME.trim());

if (/REPLACE_WITH_ATLAS_/.test(rendered)) {
  console.error('Production Wrangler config still contains unresolved placeholders.');
  process.exit(1);
}

fs.writeFileSync('wrangler.production.toml', rendered, { mode: 0o600 });
console.log('Rendered wrangler.production.toml with production bindings.');
