import { access, readFile } from 'node:fs/promises';

const required = [
  'README.md',
  'package.json',
  'wrangler.jsonc',
  'apps/web/worker/index.js',
  'apps/web/public/index.html',
  'modules/core/module.json',
  'modules/dashboard/module.json'
];

for (const path of required) await access(path);

for (const path of ['modules/core/module.json','modules/dashboard/module.json']) {
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  if (!manifest.id || !manifest.name || manifest.status !== 'active') {
    throw new Error(`Invalid ATLAS module manifest: ${path}`);
  }
}

const worker = await readFile('apps/web/worker/index.js', 'utf8');
for (const route of ['/api/status','/api/modules']) {
  if (!worker.includes(route)) throw new Error(`Missing runtime route: ${route}`);
}

console.log('ATLAS clean foundation validation: PASS');
