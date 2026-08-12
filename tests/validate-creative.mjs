import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CREATIVE_CAPABILITIES } from '../modules/creative/routes.js';

const routes=await readFile(new URL('../modules/creative/routes.js',import.meta.url),'utf8');
const migration=await readFile(new URL('../migrations/0007_creative.sql',import.meta.url),'utf8');
const worker=await readFile(new URL('../worker/index.js',import.meta.url),'utf8');

assert.ok(CREATIVE_CAPABILITIES.some(x=>x.id==='image.generate'&&x.state==='implemented'));
assert.ok(CREATIVE_CAPABILITIES.some(x=>x.id==='video.generate'&&x.state==='implemented'));
assert.ok(CREATIVE_CAPABILITIES.some(x=>x.id==='character.library'));
assert.ok(CREATIVE_CAPABILITIES.some(x=>x.id==='story.one_click'));
assert.match(routes,/requireSession/);
assert.match(routes,/requireScope/);
assert.match(routes,/organization_id=\? AND dba_id=\?/);
assert.match(routes,/\/v1\/images\/generations/);
assert.match(routes,/\/v1\/videos/);
assert.match(routes,/OPENAI_API_KEY/);
assert.match(routes,/creative\.image\.generate/);
assert.match(routes,/creative\.video\.generate/);
assert.match(routes,/audit\(/);
assert.match(migration,/creative_jobs/);
assert.match(migration,/creative_characters/);
assert.match(migration,/organization_id TEXT NOT NULL/);
assert.match(migration,/dba_id TEXT NOT NULL/);
assert.match(worker,/creativeRoutes/);

console.log('creative validation passed');
