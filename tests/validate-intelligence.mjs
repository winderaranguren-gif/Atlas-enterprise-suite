import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extractResponseText } from '../modules/intelligence/routes.js';

assert.equal(extractResponseText({output_text:'Hello ATLAS'}),'Hello ATLAS');
assert.equal(extractResponseText({output:[{content:[{type:'output_text',text:'Scoped response'}]}]}),'Scoped response');
assert.equal(extractResponseText({output:[]}), '');

const routes=await readFile(new URL('../modules/intelligence/routes.js',import.meta.url),'utf8');
const migration=await readFile(new URL('../migrations/0006_intelligence.sql',import.meta.url),'utf8');

assert.match(routes,/requireSession/);
assert.match(routes,/requireScope/);
assert.match(routes,/organization_id=\? AND dba_id=\?/);
assert.match(routes,/OPENAI_API_KEY/);
assert.match(routes,/store:false/);
assert.match(routes,/intelligence\.response\.create/);
assert.match(routes,/audit\(/);
assert.match(migration,/ai_conversations/);
assert.match(migration,/ai_messages/);
assert.match(migration,/organization_id TEXT NOT NULL/);
assert.match(migration,/dba_id TEXT NOT NULL/);

console.log('intelligence validation passed');
