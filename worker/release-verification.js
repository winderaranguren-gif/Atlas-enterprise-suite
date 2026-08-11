const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json;charset=UTF-8','cache-control':'no-store'}});
const VERIFY_ORG='atlas-e2e';
const VERIFY_DBA='pilot';
const VERIFY_EMAIL='atlas-release-verifier@example.invalid';
const SHA40=/^[0-9a-f]{40}$/i;
const id=()=>crypto.randomUUID();

async function sha256(value){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

export async function handleReleaseVerification(request,env){
  const url=new URL(request.url);
  if(url.pathname!=='/api/admin/release-verification-session') return null;
  if(request.method!=='POST') return json({error:'Method not allowed'},405);
  if(!env.DB) return json({operational:false,error:'D1 binding DB is not configured'},503);
  const configured=String(env.ATLAS_RELEASE_VERIFICATION_TOKEN||'');
  if(configured.length<32) return json({operational:false,error:'ATLAS_RELEASE_VERIFICATION_TOKEN is not configured'},503);
  const supplied=request.headers.get('x-atlas-release-verification-token')||'';
  if(!supplied||supplied!==configured) return json({error:'Unauthorized'},401);
  const deployedSha=String(env.ATLAS_DEPLOYED_SHA||'').trim().toLowerCase();
  if(!SHA40.test(deployedSha)) return json({operational:false,error:'ATLAS_DEPLOYED_SHA is invalid'},503);

  let body={};
  try{body=await request.json();}catch{return json({error:'JSON body required'},400);}
  const requestedSha=String(body.expected_sha||'').trim().toLowerCase();
  const org=String(body.organization_id||'').trim();
  const dba=String(body.dba_id||'').trim();
  if(requestedSha!==deployedSha) return json({error:'Expected SHA does not match deployed SHA'},409);
  if(org!==VERIFY_ORG||dba!==VERIFY_DBA) return json({error:'Release verification is restricted to the isolated ATLAS E2E scope'},403);

  const now=new Date().toISOString();
  let user=await env.DB.prepare('SELECT id FROM atlas_users WHERE email=?').bind(VERIFY_EMAIL).first();
  if(!user){
    user={id:id()};
    await env.DB.prepare('INSERT INTO atlas_users(id,email,display_name,status,created_at,updated_at) VALUES(?,?,?,?,?,?)')
      .bind(user.id,VERIFY_EMAIL,'ATLAS Release Verifier','active',now,now).run();
  }else{
    await env.DB.prepare("UPDATE atlas_users SET status='active',updated_at=? WHERE id=?").bind(now,user.id).run();
  }
  const membership=await env.DB.prepare('SELECT id FROM atlas_memberships WHERE user_id=? AND organization_id=? AND dba_id=?')
    .bind(user.id,VERIFY_ORG,VERIFY_DBA).first();
  if(membership){
    await env.DB.prepare("UPDATE atlas_memberships SET role='admin',status='active',updated_at=? WHERE id=?").bind(now,membership.id).run();
  }else{
    await env.DB.prepare(`INSERT INTO atlas_memberships(id,user_id,organization_id,dba_id,role,status,created_at,updated_at)
      VALUES(?,?,?,?,?,'active',?,?)`).bind(id(),user.id,VERIFY_ORG,VERIFY_DBA,'admin',now,now).run();
  }
  await env.DB.prepare('UPDATE atlas_sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL').bind(now,user.id).run();
  const rawToken=crypto.randomUUID()+crypto.randomUUID();
  const tokenHash=await sha256(rawToken);
  const expiresAt=new Date(Date.now()+15*60*1000).toISOString();
  await env.DB.prepare('INSERT INTO atlas_sessions(id,user_id,token_hash,expires_at,revoked_at,created_at,last_seen_at) VALUES(?,?,?,?,NULL,?,?)')
    .bind(id(),user.id,tokenHash,expiresAt,now,now).run();
  await env.DB.prepare(`INSERT INTO atlas_audit_events(id,organization_id,dba_id,actor_user_id,action,resource_type,resource_id,payload,created_at)
    VALUES(?,?,?,?,?,?,?,?,?)`).bind(id(),VERIFY_ORG,VERIFY_DBA,user.id,'release_verification_session','deployment',deployedSha,JSON.stringify({deployed_sha:deployedSha,expires_at:expiresAt}),now).run();
  return json({ok:true,session_token:rawToken,expires_at:expiresAt,organization_id:VERIFY_ORG,dba_id:VERIFY_DBA,deployed_sha:deployedSha},201);
}
