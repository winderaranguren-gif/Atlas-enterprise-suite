import { authorize, json, text } from './crm-shared.js';

export async function globalSearch(request,env,url){
  const gate=await authorize(request,env,'crm.read','crm.search');
  if(gate.response)return gate.response;
  const {authz}=gate;
  const q=text(url.searchParams.get('q'),120);
  if(q.length<2)return json({ok:true,results:[]});
  const like=`%${q}%`;
  const accounts=await env.DB.prepare("SELECT id,name AS title,'account' AS type,status FROM crm_accounts WHERE organization_id=? AND dba_id=? AND name LIKE ? LIMIT 20").bind(authz.organizationId,authz.dbaId,like).all();
  return json({ok:true,results:accounts.results||[]});
}
