const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json;charset=UTF-8','cache-control':'no-store'}});
const REQUIRED_TABLES=['atlas_users','atlas_memberships','atlas_sessions','atlas_security_events','atlas_audit_events','atlas_bootstrap_state','atlas_password_credentials','atlas_activation_tokens','atlas_documents','atlas_document_versions','atlas_accounts','atlas_journal_entries','atlas_journal_lines','atlas_backup_manifests'];
const REQUIRED_TRIGGERS=['atlas_audit_events_no_update','atlas_audit_events_no_delete','atlas_security_events_no_update','atlas_security_events_no_delete'];
const SHA40=/^[0-9a-f]{40}$/i;

async function schemaStatus(env){
  if(!env.DB) return {ok:false,missingTables:[...REQUIRED_TABLES],missingTriggers:[...REQUIRED_TRIGGERS],error:'D1 binding DB is not configured'};
  try{
    const result=await env.DB.prepare("SELECT type,name FROM sqlite_schema WHERE type IN ('table','trigger')").all();
    const rows=result.results||[];
    const tables=new Set(rows.filter(row=>row.type==='table').map(row=>row.name));
    const triggers=new Set(rows.filter(row=>row.type==='trigger').map(row=>row.name));
    const missingTables=REQUIRED_TABLES.filter(name=>!tables.has(name));
    const missingTriggers=REQUIRED_TRIGGERS.filter(name=>!triggers.has(name));
    return {ok:missingTables.length===0&&missingTriggers.length===0,missingTables,missingTriggers};
  }catch(error){
    return {ok:false,missingTables:[...REQUIRED_TABLES],missingTriggers:[...REQUIRED_TRIGGERS],error:String(error?.message||error)};
  }
}

export async function handleSystemReadiness(request,env){
  const url=new URL(request.url);
  if(request.method!=='GET') return null;
  const sha=String(env.ATLAS_DEPLOYED_SHA||'').trim().toLowerCase();
  const verifiedSha=String(env.ATLAS_RELEASE_VERIFIED_SHA||'').trim().toLowerCase();
  if(url.pathname==='/api/system/release-fingerprint'){
    return json({
      service:'ATLAS Commercial Pilot',
      deployedSha:SHA40.test(sha)?sha:null,
      shaConfigured:SHA40.test(sha),
      verifiedSha:SHA40.test(verifiedSha)?verifiedSha:null,
      releaseVerified:SHA40.test(sha)&&verifiedSha===sha
    });
  }
  if(url.pathname!=='/api/system/readiness') return null;
  const schema=await schemaStatus(env);
  const infrastructureChecks={
    d1:!!env.DB,
    backupsR2:!!env.BACKUPS,
    bootstrapSecret:typeof env.ATLAS_BOOTSTRAP_TOKEN==='string'&&env.ATLAS_BOOTSTRAP_TOKEN.length>=24,
    releaseVerificationSecret:typeof env.ATLAS_RELEASE_VERIFICATION_TOKEN==='string'&&env.ATLAS_RELEASE_VERIFICATION_TOKEN.length>=32,
    deployedSha:SHA40.test(sha),
    requiredTables:schema.missingTables.length===0,
    appendOnlyAuditTriggers:schema.missingTriggers.length===0
  };
  const infrastructureReady=Object.values(infrastructureChecks).every(Boolean);
  const releaseVerified=SHA40.test(verifiedSha)&&SHA40.test(sha)&&verifiedSha===sha;
  const operational=infrastructureReady&&releaseVerified;
  const preflight=url.searchParams.get('phase')==='preflight';
  return json({
    operational,
    infrastructureReady,
    releaseVerified,
    service:'ATLAS Commercial Pilot',
    deployedSha:infrastructureChecks.deployedSha?sha:null,
    verifiedSha:SHA40.test(verifiedSha)?verifiedSha:null,
    checks:{...infrastructureChecks,releaseVerified},
    missingTables:schema.missingTables,
    missingAuditTriggers:schema.missingTriggers,
    tableCheckError:schema.error||null,
    phase:preflight?'preflight':'operational'
  },preflight?(infrastructureReady?200:503):(operational?200:503));
}
