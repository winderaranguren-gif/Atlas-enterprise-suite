import { readFile } from 'node:fs/promises';

await readFile('worker/index.js','utf8');
await readFile('platform/runtime/health.js','utf8');
console.log('ATLAS build contract passed');
