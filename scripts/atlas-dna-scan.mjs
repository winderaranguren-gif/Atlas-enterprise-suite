import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, dirname, relative, extname } from 'node:path';

const root=resolve(new URL('..',import.meta.url).pathname);
const failures=[];
const warnings=[];
const skip=new Set(['.git','node_modules','.wrangler','dist','coverage']);
const sourceExt=new Set(['.js','.mjs','.cjs','.json','.html','.css','.md']);
const imported=new Set();

async function exists(path){try{await stat(path);return true}catch{return false}}
async function walk(dir,out=[]){for(const name of await readdir(dir)){if(skip.has(name))continue;const p=resolve(dir,name),s=await stat(p);if(s.isDirectory())await walk(p,out);else if(sourceExt.has(extname(name)))out.push(p)}return out}
function fail(code,detail){failures.push({code,detail})}
function warn(code,detail){warnings.push({code,detail})}

const wranglerPath=resolve(root,'wrangler.jsonc');
const baselinePath=resolve(root,'infra/cloudflare/production-baseline.json');
const wrangler=JSON.parse(await readFile(wranglerPath,'utf8'));
const baseline=JSON.parse(await readFile(baselinePath,'utf8'));
if(wrangler.main!==baseline?.wrangler?.main)fail('entrypoint_baseline_mismatch',`${wrangler.main} != ${baseline?.wrangler?.main}`);
const entry=resolve(root,wrangler.main||'');
if(!wrangler.main||!await exists(entry))fail('entrypoint_missing',String(wrangler.main||''));

const files=await walk(root);
const importPattern=/\b(?:import|export)\s+(?:[^'\"]*?\s+from\s+)?['\"](\.{1,2}\/[^'\"]+)['\"]/g;
const secretPatterns=[
 ['private_key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
 ['openai_key',/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/],
 ['github_pat',/\bgithub_pat_[A-Za-z0-9_]{20,}\b/],
 ['github_token',/\bgh[pousr]_[A-Za-z0-9]{20,}\b/],
 ['aws_access_key',/\bAKIA[0-9A-Z]{16}\b/]
];
const dangerous=[
 ['eval',/\beval\s*\(/],
 ['new_function',/\bnew\s+Function\s*\(/],
 ['child_process',/from\s+['\"]node:child_process['\"]|require\s*\(\s*['\"]child_process['\"]\s*\)/],
 ['shell_exec',/\b(?:exec|execSync|spawn|spawnSync)\s*\(/]
];

for(const file of files){
 const rel=relative(root,file).replaceAll('\\','/');
 const text=await readFile(file,'utf8');
 for(const [name,re] of secretPatterns)if(re.test(text))fail(`secret_${name}`,rel);
 if(/\.(?:js|mjs|cjs)$/.test(file)){
  for(const [name,re] of dangerous)if(re.test(text))warn(`dynamic_${name}`,rel);
  for(const match of text.matchAll(importPattern)){
   const spec=match[1];
   let target=resolve(dirname(file),spec);
   if(!extname(target)){
    const candidates=[`${target}.js`,`${target}.mjs`,resolve(target,'index.js')];
    target=candidates.find(p=>files.includes(p))||candidates[0];
   }
   imported.add(target);
   if(!await exists(target))fail('broken_relative_import',`${rel} -> ${spec}`);
  }
 }
}
for(const file of imported){
 if(await exists(file)){
  const body=await readFile(file,'utf8');
  if(!body.trim())fail('empty_imported_module',relative(root,file).replaceAll('\\','/'));
 }
}

const authPath=resolve(root,'modules/auth.js');
if(await exists(authPath)){
 const auth=await readFile(authPath,'utf8');
 for(const required of ['ATLAS_BOOTSTRAP_TOKEN','identity_database_unavailable','HttpOnly','SameSite=Strict'])if(!auth.includes(required))fail('auth_invariant_missing',required);
}else fail('auth_module_missing','modules/auth.js');

const hardeningPath=resolve(root,'modules/web-hardening.js');
if(await exists(hardeningPath)){
 const web=await readFile(hardeningPath,'utf8');
 if(!web.includes("url.pathname==='/signup'"))fail('signup_route_missing','modules/web-hardening.js');
 if(!web.includes('Create your ATLAS account'))fail('signup_ui_missing','modules/web-hardening.js');
}else fail('web_hardening_missing','modules/web-hardening.js');

const workerPath=resolve(root,'worker.js');
if(await exists(workerPath)){
 const worker=await readFile(workerPath,'utf8');
 if(!worker.includes("'/signup'"))fail('signup_not_public_in_service_worker','worker.js');
 if(!worker.includes('requireBrowserSession'))fail('protected_session_guard_missing','worker.js');
}

if(warnings.length)console.warn('ATLAS DNA warnings:',JSON.stringify(warnings,null,2));
if(failures.length){console.error('ATLAS DNA scan failed:',JSON.stringify(failures,null,2));process.exit(42)}
console.log(`ATLAS DNA scan passed. Reviewed ${files.length} source/config files; ${warnings.length} warning(s).`);
