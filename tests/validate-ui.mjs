import fs from 'node:fs';
import { publicRuntimeMeta } from '../platform/runtime/meta.js';

const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
for(const required of [
  '<html lang="en">',
  'atlas.language',
  'English',
  'Español',
  "fetch('/api/health'",
  "fetch('/api/meta'",
  'Nothing on this screen is marked operational unless the backend reports it.'
]){
  if(!html.includes(required)) throw new Error(`UI missing production requirement: ${required}`);
}
const meta=publicRuntimeMeta({ATLAS_DEFAULT_LANGUAGE:'en',ATLAS_SUPPORTED_LANGUAGES:'en,es',ATLAS_DEPLOYED_SHA:'test-sha'});
if(meta.defaultLanguage!=='en') throw new Error('English must remain default language');
if(!meta.supportedLanguages.includes('es')) throw new Error('Spanish selector support missing');
if(meta.deployedSha!=='test-sha') throw new Error('deployment SHA not exposed');
if(!Array.isArray(meta.modules)||meta.modules.length===0) throw new Error('module registry not exposed to UI');
console.log('ATLAS UI validation passed');
