import fs from 'node:fs';
import { publicRuntimeMeta } from '../platform/runtime/meta.js';

const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const accounting=fs.readFileSync(new URL('../public/accounting.js',import.meta.url),'utf8');
const users=fs.readFileSync(new URL('../public/users.js',import.meta.url),'utf8');
for(const required of [
  '<html lang="en">','English','Español','loginForm','scopeSelector','Commercial pilot workspace',
  'Nothing on this screen is marked operational unless the backend reports it.','crmWorkspace','crmForm','crmRows',
  'documentsWorkspace','documentUploadForm','documentFile','documentRows','accountingWorkspace','accountForm','accountRows','journalForm','journalLines','journalRows','journalBalance','/app.js','/accounting.js'
]){
  if(!html.includes(required)) throw new Error(`UI missing production requirement: ${required}`);
}
for(const required of [
  'atlas.language',"fetch('/api/health'","fetch('/api/meta'","api('/api/auth/login'","api('/api/auth/session'","api('/api/auth/logout'",
  "'/api/identity/memberships'","'/api/crm/contacts'","'/api/documents'","'/api/accounting/accounts'","'/api/accounting/journals'","'/api/backups'","'/api/audit-events'",
  "sessionStorage.getItem('atlas.session')","'x-atlas-organization'","'x-atlas-dba'","method:id?'PATCH':'POST'","method:'DELETE'",'canWrite()',
  "api('/api/documents',{method:'POST'",'/versions`','/content`','binaryApi(','URL.createObjectURL(blob)','archiveDocument','selectNewVersion','downloadDocument','loadDocuments'
]){
  if(!app.includes(required)) throw new Error(`UI runtime wiring missing: ${required}`);
}
for(const required of [
  "import './users.js'","sessionStorage.getItem('atlas.session')","'x-atlas-organization'","'x-atlas-dba'","api('/api/auth/session'","api('/api/accounting/accounts')","api('/api/accounting/journals')",
  "api('/api/accounting/accounts',{method:'POST'","api('/api/accounting/journals',{method:'POST'",'/post`','canAccountWrite()','canJournalWrite()','canPost()','debit!==credit','Math.round(n*100)','Balanced','Not balanced'
]){
  if(!accounting.includes(required)) throw new Error(`Accounting UI runtime wiring missing: ${required}`);
}
for(const required of [
  'identityWorkspace','userProvisionForm','membershipRows','dbaForm','dbaRows','activationToken','identityCopy={en:','es:{title:',"document.documentElement.lang==='es'","$('language')?.addEventListener('change'",'translateIdentity()',
  "api('/api/auth/session'","api('/api/identity/memberships')","api('/api/identity/dbas')",
  "api('/api/identity/users',{method:'POST'","/api/identity/memberships/${encodeURIComponent(id)}`","method:'PATCH'","api('/api/auth/setup-token',{method:'POST'","api('/api/identity/dbas',{method:'POST'",
  "sessionStorage.getItem('atlas.session')","'x-atlas-organization'","'x-atlas-dba'",'canAdmin()','canGrantOwner()'
]){
  if(!users.includes(required)) throw new Error(`Identity UI runtime wiring missing: ${required}`);
}
for(const role of ['owner','admin','member']) if(!app.includes(`'${role}'`)&&!accounting.includes(`'${role}'`)&&!users.includes(`'${role}'`)) throw new Error(`UI missing write role: ${role}`);
const identityRoutes=fs.readFileSync(new URL('../modules/identity/routes.js',import.meta.url),'utf8');
if(!identityRoutes.includes('last_active_owner_required')) throw new Error('Identity backend must protect the last active owner');
const meta=publicRuntimeMeta({ATLAS_DEFAULT_LANGUAGE:'en',ATLAS_SUPPORTED_LANGUAGES:'en,es',ATLAS_DEPLOYED_SHA:'test-sha'});
if(meta.defaultLanguage!=='en') throw new Error('English must remain default language');
if(!meta.supportedLanguages.includes('es')) throw new Error('Spanish selector support missing');
if(meta.deployedSha!=='test-sha') throw new Error('deployment SHA not exposed');
if(!Array.isArray(meta.modules)||meta.modules.length===0) throw new Error('module registry not exposed to UI');
console.log('ATLAS UI validation passed');
