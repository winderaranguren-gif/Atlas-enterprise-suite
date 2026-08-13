import { counts } from './crm-counts.js';
import { pipelineValue } from './crm-value.js';
import { json } from './crm-shared.js';
export async function dashboard(request,env){
  const countsResponse=await counts(request,env);
  if(!countsResponse.ok)return countsResponse;
  const valueResponse=await pipelineValue(request,env);
  if(!valueResponse.ok)return valueResponse;
  const countBody=await countsResponse.json(),valueBody=await valueResponse.json();
  return json({ok:true,dashboard:{...countBody.counts,...valueBody}});
}
