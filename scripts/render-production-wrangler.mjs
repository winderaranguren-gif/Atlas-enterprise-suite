import { readFile, writeFile } from 'node:fs/promises';

const required = ['ATLAS_D1_DATABASE_NAME','ATLAS_D1_DATABASE_ID'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required production setting: ${key}`);
}

let config = await readFile('wrangler.jsonc', 'utf8');
config = config
  .replace('REPLACE_WITH_ATLAS_D1_DATABASE_NAME', process.env.ATLAS_D1_DATABASE_NAME)
  .replace('REPLACE_WITH_ATLAS_D1_DATABASE_ID', process.env.ATLAS_D1_DATABASE_ID);

if (config.includes('REPLACE_WITH_')) throw new Error('Unresolved production placeholders remain in Wrangler config');
await writeFile('wrangler.production.jsonc', config, 'utf8');
console.log('Rendered wrangler.production.jsonc with production D1 bindings');
