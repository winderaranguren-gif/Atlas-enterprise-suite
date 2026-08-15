import { requireTenantPermission } from './tenant.js';
import { ensureTransportationSchema } from './transportation-schema.js';

const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});

export async function transportationSafetyRoutes(request,env,url=new URL(request.url)){
  if(request.method!=='PATCH')return null;
  const path=url.pathname.length>1?url.pathname.replace(/\/+$/,''):url.pathname;
  const match=path.match(/^\/api\/transportation\/trips\/([^/]+)$/);
  if(!match)return null;
  const copy=request.clone();
  const body=await copy.json().catch(()=>null);
  if(!body||body.status!=='completed')return null;
  const authz=await requireTenantPermission(request,env,'module.write','transportation.trip.completion_guard');
  if(!authz.ok)return json({ok:false,error:authz.error},authz.status);
  try{const schema=await ensureTransportationSchema(env);if(!schema.ok)return json({ok:false,error:schema.error},503)}catch{return json({ok:false,error:'transportation_schema_unavailable'},503)}
  const trip=await env.DB.prepare(`SELECT id,status,distance_miles_milli FROM fleet_trips WHERE id=? AND organization_id=? AND dba_id=?`).bind(decodeURIComponent(match[1]),authz.organizationId,authz.dbaId).first();
  if(!trip)return null;
  if(trip.status==='completed')return json({ok:true,trip:{id:trip.id,status:'completed',distanceMilesMilli:Number(trip.distance_miles_milli||0)},idempotent:true});
  return null;
}
