import { authorize, json } from './crm-shared.js';
export async function counts(request,env){
  const gate=await authorize(request,env,'crm.read','crm.counts.read');
  if(gate.response)return gate.response;
  const {authz}=gate;
  const rows=await env.DB.prepare("SELECT 'accounts' k,COUNT(*) v FROM crm_accounts WHERE organization_id=? AND dba_id=? UNION ALL SELECT 'contacts',COUNT(*) FROM crm_contacts WHERE organization_id=? AND dba_id=? UNION ALL SELECT 'leads',COUNT(*) FROM crm_leads WHERE organization_id=? AND dba_id=? AND status IN ('new','contacted','qualified') UNION ALL SELECT 'opportunities',COUNT(*) FROM crm_opportunities WHERE organization_id=? AND dba_id=? AND status='open'").bind(authz.organizationId,authz.dbaId,authz.organizationId,authz.dbaId,authz.organizationId,authz.dbaId,authz.organizationId,authz.dbaId).all();
  return json({ok:true,counts:Object.fromEntries((rows.results||[]).map(r=>[r.k,Number(r.v||0)]))});
}
