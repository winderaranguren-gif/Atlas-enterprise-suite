import fs from 'node:fs';

const required=[
  'README.md',
  'package.json',
  'wrangler.jsonc',
  'worker/index.js',
  'platform/runtime/health.js',
  'public/index.html'
];
for(const file of required){
  if(!fs.existsSync(file)) throw new Error(`Missing required file: ${file}`);
}
const wrangler=fs.readFileSync('wrangler.jsonc','utf8');
for(const marker of ['"main": "worker/index.js"','"binding": "DB"','"binding": "BACKUPS"','"run_worker_first": true']){
  if(!wrangler.includes(marker)) throw new Error(`Missing deployment contract: ${marker}`);
}
const html=fs.readFileSync('public/index.html','utf8');
if(!html.includes('<html lang="en">')) throw new Error('English must be the default language');
if(!html.includes('value="es"')) throw new Error('Spanish selector missing');
console.log('ATLAS clean structure validation passed');
