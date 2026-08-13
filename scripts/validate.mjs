import { access, readFile } from 'node:fs/promises';

const required = ['README.md', 'package.json', 'worker.js', 'wrangler.jsonc'];

for (const file of required) {
  await access(file);
}

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
if (pkg.name !== 'atlas-enterprise-suite') throw new Error('invalid_package_name');
if (!pkg.scripts?.['build:prod']) throw new Error('missing_build_prod_script');

const worker = await readFile('worker.js', 'utf8');
if (!worker.includes('/api/health')) throw new Error('missing_health_endpoint');

console.log('ATLAS foundation validation passed');
