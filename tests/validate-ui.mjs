import fs from 'node:fs';
import { publicRuntimeMeta } from '../platform/runtime/meta.js';

const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
for(const required of [
  '<html lang="en">',
  'English',
  'Español',
  'loginForm',
  'scopeSelector',
  'Commercial pilot workspace',
  'Nothing on this screen is marked operational unless the backend reports it.',
  'crmWorkspace',
  'crmForm',
  'crmRows',
  '/app.js'
]){
  if(!html.includes(required)) throw new Error(`UI missing production requirement: ${required}`);
}
for(const required of [
  'atlas.language',
  "fetch('/api/health'",
  "fetch('/api/meta'",
  "api('/api/auth/login'",
  "api('/api/auth/session'",
  "api('/api/auth/logout'",
  "'/api/identity/memberships'",
  "'/api/crm/contacts'",
  "'/api/documents'",
  "'/api/accounting/accounts'",
  "'/api/accounting/journals'",
  "'/api/backups'",
  "'/api/audit-events'",
  "sessionStorage.getItem('atlas.session')",
  "'x-atlas-organization'",
  "'x-atlas-dba'",
  "method:id?'PATCH':'POST'",
  "method:'DELETE'",
  'canWriteCrm()',
  'owner','admin','member',
  'archiveContact',
  'editContact'
]){
  if(!app.includes(required)) throw new Error(`UI runtime wiring missing: ${required}`);
}
const meta=publicRuntimeMeta({ATLAS_DEFAULT_LANGUAGE:'en',ATLAS_SUPPORTED_LANGUAGES:'en,es',ATLAS_DEPLOYED_SHA:'test-sha'});
if(meta.defaultLanguage!=='en') throw new Error('English must remain default language');
if(!meta.supportedLanguages.includes('es')) throw new Error('Spanish selector support missing');
if(meta.deployedSha!=='test-sha') throw new Error('deployment SHA not exposed');
if(!Array.isArray(meta.modules)||meta.modules.length===0) throw new Error('module registry not exposed to UI');
console.log('ATLAS UI validation passed');
