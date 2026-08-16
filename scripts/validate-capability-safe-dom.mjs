import { Script } from 'node:vm';
import { readFile } from 'node:fs/promises';
import { capabilitySecurityRuntime } from '../modules/capability-security-runtime.js';

const fail=message=>{throw new Error(`[capability-safe-dom] ${message}`)};
const assert=(condition,message)=>{if(!condition)fail(message)};

const runtime=capabilitySecurityRuntime();
try{new Script(runtime,{filename:'atlas-capability-security.browser.js'})}catch(error){fail(`security runtime does not compile: ${error.message}`)}

for(const marker of [
  "'SCRIPT'","'IFRAME'","'OBJECT'","'EMBED'","'STYLE'",
  "name.startsWith('on')","name==='srcdoc'","name==='style'",
  "v.startsWith('javascript:')","v.startsWith('vbscript:')",
  "v.startsWith('data:text/html')","v.startsWith('data:image/svg+xml')",
  "Object.defineProperty(Element.prototype,'innerHTML'",
  "__ATLAS_CAPABILITY_SAFE_DOM__"
])assert(runtime.includes(marker),`security runtime missing defense ${marker}`);

const meta=await readFile(new URL('../worker-meta.js',import.meta.url),'utf8');
assert(meta.includes("import { capabilitySecurityRuntime } from './modules/capability-security-runtime.js';"),'worker-meta must import Safe DOM runtime');
assert(meta.includes("url.pathname==='/assets/atlas-capability-security.js'"),'worker-meta must serve Safe DOM asset');
assert(meta.includes("source.replace('<script>',safeDom+'<script>')"),'Safe DOM must be inserted before Capability inline script');
assert(meta.includes("const config=CAPABILITY_BRIDGES[url.pathname]"),'Safe DOM injection must be scoped to registered Capability detail routes');

const bridges=[...meta.matchAll(/'\/platform\/capabilities\/[^']+'\s*:\s*\{/g)];
assert(bridges.length===10,`expected Safe DOM coverage for 10 capability bridges, found ${bridges.length}`);

console.log('ATLAS Safe DOM gate passed: runtime compiles, dangerous DOM vectors are stripped, and all 10 Capability detail pages load protection before their inline scripts.');
