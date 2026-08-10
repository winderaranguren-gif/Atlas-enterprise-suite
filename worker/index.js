// ATLAS Cloudflare-native service layer
// CRM routes are backed by D1. No traditional server is required.
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json;charset=UTF-8'}});
const id=()=>crypto.randomUUID();
const TYPES={accounts:'crm_accounts',contacts:'crm_contacts',leads:'crm_leads',opportunities:'crm_opportunities',tasks:'crm_tasks',activity:'crm_activity'};

export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/crm/')) return env.ASSETS?env.ASSETS.fetch(request):new Response('Not found',{status:404});
  if(!env.DB) return json({operational:false,error:'D1 binding DB is not configured'},503);
  try{
   if(url.pathname==='/api/crm/health'){
    await env.DB.prepare('SELECT 1 AS ok').first();
    return json({operational:true,storage:'D1',service:'ATLAS CRM'});
   }
   const type=url.pathname.split('/').filter(Boolean)[2];
   const table=TYPES[type];
   if(!table) return json({error:'Unknown CRM resource'},404);
   const org=request.headers.get('x-atlas-organization')||'atlas';
   const dba=request.headers.get('x-atlas-dba')||'default';
   if(request.method==='GET'){
    const r=await env.DB.prepare(`SELECT * FROM ${table} WHERE organization_id=? AND dba_id=? ORDER BY updated_at DESC`).bind(org,dba).all();
    return json({[type]:r.results||[]});
   }
   if(request.method==='POST'){
    const body=await request.json(); const recordId=id(); const now=new Date().toISOString();
    await env.DB.prepare(`INSERT INTO ${table}(id,organization_id,dba_id,name,email,status,stage,owner,amount,payload,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).bind(recordId,org,dba,body.name||body.title||'',body.email||'',body.status||'active',body.stage||'new',body.owner||'',body.amount||null,JSON.stringify(body),now,now).run();
    await env.DB.prepare('INSERT INTO audit_log(id,organization_id,dba_id,action,resource_type,resource_id,payload,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(id(),org,dba,'create',type,recordId,JSON.stringify(body),now).run();
    return json({ok:true,id:recordId},201);
   }
   return json({error:'Method not allowed'},405);
  }catch(e){return json({operational:false,error:e.message},500)}
 }
};