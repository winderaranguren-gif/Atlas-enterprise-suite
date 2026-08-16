import { Script } from 'node:vm';
import { readFile } from 'node:fs/promises';
import { formsControlRoutes } from '../modules/forms-control.js';

const fail=message=>{throw new Error(`[forms-control] ${message}`)};
const assert=(condition,message)=>{if(!condition)fail(message)};
const url=new URL('https://atlas.validation.local/platform/forms-control');
const response=await formsControlRoutes(new Request(url,{method:'GET'}),{},url);
assert(response?.status===200,'Forms Control route must return 200 before outer auth wrapping');
const body=await response.text();

for(const marker of [
  'ATLAS Forms Control','Form designer','Live preview','Required','Always show',
  'Show when field equals','Local file','Acknowledgment / signature draft','Test submission',
  'Copy template JSON','Draft acknowledgment only — not represented as a legal e-signature.',
  'Nothing submitted here is sent to a server.'
])assert(body.includes(marker),`Forms Control missing ${marker}`);

for(const marker of ['localStorage','conditionField','conditionValue','CSS.escape','crypto.randomUUID','navigator.clipboard'])assert(body.includes(marker),`Forms Control missing browser capability ${marker}`);
for(const prohibited of ['fetch(','XMLHttpRequest','/api/upload','checkout','legal e-signature service is active'])assert(!body.includes(prohibited),`Forms Control must remain local/non-binding: ${prohibited}`);

const scripts=[...body.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
assert(scripts.length===1,'Forms Control must have one local browser script');
try{new Script(scripts[0],{filename:'atlas-forms-control.browser.js'})}catch(error){fail(`Forms Control browser script does not compile: ${error.message}`)}

const workerCrm=await readFile(new URL('../worker-crm.js',import.meta.url),'utf8');
const workerMeta=await readFile(new URL('../worker-meta.js',import.meta.url),'utf8');
assert(workerCrm.includes("import { formsControlRoutes } from './modules/forms-control.js';"),'protected runtime must import Forms Control');
assert(workerCrm.includes("url.pathname==='/platform/forms-control'"),'protected runtime must intercept Forms Control route');
assert(workerCrm.includes('verifiedWorkspaceResponse(request,env,url,workspace)'),'Forms Control must pass browser-session verification');
assert(workerCrm.includes("url.pathname==='/platform/documents'&&!body.includes('href=\"/platform/forms-control\"')"),'Documents must expose Forms Control entrypoint');
assert(workerMeta.includes("'/platform/capabilities/forms'"),'Forms Capability bridge must remain registered');
assert(workerMeta.includes("href:'/platform/documents'"),'Forms Capability must retain Documents handoff');

console.log('ATLAS Forms Control gate passed: conditional builder, local file metadata, draft acknowledgment, protected routing and Documents handoff verified.');
