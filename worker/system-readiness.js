const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json;charset=UTF-8','cache-control':'no-store'}});
const REQUIRED_TABLES=['atlas_users','atlas_memberships','atlas_sessions','atlas_security_events','atlas_audit_events','atlas_bootstrap_state','atlas_documents','atlas_document_versions','atlas_accounts','atlas_journal_entries','atlas_journal_lines','atlas_backup_manifests'];
const SHA40=/^[0-9a-f]{40}$/i;

async function tableStatus(env){
  if(!env.DB) return {ok:false,missing:[...REQUIRED_TABLES],error:'D1 binding DB is not configured'};
  try{
    const result=await env.DB.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all();
    const names=new Set((result.results||[]).map(row=>row.name));
    const missing=REQUIRED_TABLES.filter(name=>!names.has(name));
    return {ok:missing.length===0,missing};
  }catch(error){
    return {ok:false,missing:[...REQUIRED_TABLES],error:String(error?.message||error)};
  }
}

export async function handleSystemReadiness(request,env){
  const url=new URL(request.url);
  if(request.method!=='GET') return null;
  const sha=String(env.ATLAS_DEPLOYED_SHA||'').trim();
  if(url.pathname==='/api/system/release-fingerprint'){
    return json({service:'ATLAS Commercial Pilot',deployedSha:SHA40.test(sha)?sha:null,shaConfigured:SHA40.test(sha)});
  }
  if(url.pathname!=='/api/system/readiness') return null;
  const tables=await tableStatus(env);
  const checks={
    d1:!!env.DB,
    backupsR2:!!env.BACKUPS,
    bootstrapSecret:typeof env.ATLAS_BOOTSTRAP_TOKEN==='string'&&env.ATLAS_BOOTSTRAP_TOKEN.length>=24,
    deployedSha:SHA40.test(sha),
    requiredTables:tables.ok
  };
  const operational=Object.values(checks).every(Boolean);
  return json({
    operational,
    service:'ATLAS Commercial Pilot',
    deployedSha:checks.deployedSha?sha:null,
    checks,
    missingTables:tables.missing,
    tableCheckError:tables.error||null
  },operational?200:503);
}
