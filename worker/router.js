import core from './index.js';
import { handleDocuments } from './documents.js';
import { handleAccounting } from './accounting.js';
import { handleBackups } from './backups.js';

const noStoreJson=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json;charset=UTF-8','cache-control':'no-store'}});
const REQUIRED_TABLES=[
  'crm_accounts','crm_contacts','crm_leads','crm_opportunities','crm_tasks','crm_activity',
  'atlas_users','atlas_memberships','atlas_sessions','atlas_security_events','atlas_audit_events','atlas_bootstrap_state',
  'atlas_documents','atlas_document_versions',
  'accounting_accounts','accounting_journal_entries','accounting_journal_lines',
  'atlas_backup_manifests'
];

async function readiness(env){
  const sourceSha=String(env.ATLAS_DEPLOYED_SHA||'').trim();
  const bindings={
    d1:!!env.DB,
    r2Backups:!!env.BACKUPS,
    bootstrapSecret:!!String(env.ATLAS_BOOTSTRAP_TOKEN||'').trim(),
    deployedSha:/^[0-9a-f]{40}$/i.test(sourceSha)
  };
  let missingTables=[...REQUIRED_TABLES];
  let d1QueryOk=false;
  if(env.DB){
    try{
      const result=await env.DB.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all();
      const existing=new Set((result.results||[]).map(row=>row.name));
      missingTables=REQUIRED_TABLES.filter(name=>!existing.has(name));
      d1QueryOk=true;
    }catch{
      d1QueryOk=false;
    }
  }
  const operational=Object.values(bindings).every(Boolean)&&d1QueryOk&&missingTables.length===0;
  return {operational,bindings,d1QueryOk,missingTables,sourceSha:bindings.deployedSha?sourceSha:null};
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/system/release-fingerprint'&&request.method==='GET'){
      const sourceSha=String(env.ATLAS_DEPLOYED_SHA||'').trim();
      return noStoreJson({
        service:'ATLAS Enterprise Suite',
        sourceSha:sourceSha||null,
        verified:/^[0-9a-f]{40}$/i.test(sourceSha)
      },sourceSha?200:503);
    }
    if(url.pathname==='/api/system/readiness'&&request.method==='GET'){
      const report=await readiness(env);
      return noStoreJson(report,report.operational?200:503);
    }
    if(url.pathname.startsWith('/api/documents')){
      const response=await handleDocuments(request,env,ctx);
      if(response) return response;
    }
    if(url.pathname.startsWith('/api/accounting')){
      const response=await handleAccounting(request,env,ctx);
      if(response) return response;
    }
    if(url.pathname.startsWith('/api/backups')){
      const response=await handleBackups(request,env,ctx);
      if(response) return response;
    }
    return core.fetch(request,env,ctx);
  }
};
