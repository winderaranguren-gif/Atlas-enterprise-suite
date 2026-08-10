import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

for (const key of ['CLOUDFLARE_API_TOKEN','CLOUDFLARE_ACCOUNT_ID']) {
  if (!process.env[key]) {
    console.error(`Missing required backup credential: ${key}`);
    process.exit(2);
  }
}

const databaseName = process.env.ATLAS_D1_DATABASE_NAME || 'atlas-enterprise-suite';
const reason = (process.argv[2] || 'scheduled').replace(/[^a-z0-9_-]/gi,'-').toLowerCase();
const stamp = new Date().toISOString().replace(/[:.]/g,'-');
const dir = path.resolve('backups');
fs.mkdirSync(dir,{recursive:true});
const sqlPath = path.join(dir,`atlas-d1-${reason}-${stamp}.sql`);
const manifestPath = `${sqlPath}.manifest.json`;

execFileSync('npx',[
  '--yes','wrangler@4','d1','export',databaseName,
  '--remote','--skip-confirmation','--output',sqlPath
],{stdio:'inherit',env:process.env});

if (!fs.existsSync(sqlPath) || fs.statSync(sqlPath).size === 0) {
  console.error('D1 backup export is missing or empty');
  process.exit(3);
}

const bytes = fs.readFileSync(sqlPath);
const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
const manifest = {
  product: 'ATLAS Enterprise Suite',
  database: databaseName,
  reason,
  created_at: new Date().toISOString(),
  file: path.basename(sqlPath),
  bytes: bytes.length,
  sha256
};
fs.writeFileSync(manifestPath,`${JSON.stringify(manifest,null,2)}\n`);
console.log(`ATLAS D1 backup verified: ${manifest.file} (${manifest.bytes} bytes, sha256 ${sha256})`);
