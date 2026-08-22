import {ConnectStore,handleConnect} from '../modules/connect-worker.js';

class MemoryStorage{
  constructor(){this.data=new Map();}
  async get(key){return this.data.get(key);}
  async put(key,value){this.data.set(key,structuredClone(value));}
}
const instance=new ConnectStore({storage:new MemoryStorage()});
const env={CONNECT_STORE:{idFromName:name=>name,get:()=>({fetch:request=>instance.fetch(request instanceof Request?request:new Request(request))})}};

for(const path of ['/connect','/connect/inbox','/connect/contacts','/connect/routing','/connect/tasks','/connect/network','/connect/devices','/connect/policies','/connect/settings']){
  const response=await handleConnect(new Request('https://atlasenterprisesuite.com'+path),env);
  if(!response||response.status!==200)throw new Error('Connect route failed: '+path);
  if(!(await response.text()).includes('ATLAS Connect + Network Fabric'))throw new Error('Connect identity missing: '+path);
}
const status=await handleConnect(new Request('https://atlasenterprisesuite.com/api/connect/status'),env);
const statusBody=await status.json();
if(statusBody.telephony.configured!==false)throw new Error('Unconfigured telephony must not report connected');
if(statusBody.network_adapter.configured!==false)throw new Error('Unconfigured network adapter must not report configured');

const headers={'content-type':'application/json','x-atlas-tenant-id':'validation-tenant','x-atlas-actor-id':'validation'};
const request=(path,method='GET',body)=>handleConnect(new Request('https://atlasenterprisesuite.com'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}),env);

const create=await request('/api/connect/conversations','POST',{channel:'note',contact_name:'Validation Contact',subject:'Smoke test',body:'A real internal interaction record.'});
if(create.status!==201)throw new Error('Conversation creation failed');

const connectionResponse=await request('/api/connect/network/connections','POST',{name:'Validation WAN',provider:'verizon',kind:'5g',site:'Validation HQ'});
if(connectionResponse.status!==201)throw new Error('Network connection creation failed');
const connection=(await connectionResponse.json()).item;
if(connection.status!=='unverified')throw new Error('New carrier connections must start unverified');

const deviceResponse=await request('/api/connect/network/devices','POST',{name:'POS Validation 01',type:'pos',connection_id:connection.id,criticality:'high'});
if(deviceResponse.status!==201)throw new Error('Device registration failed');

const policyResponse=await request('/api/connect/network/policies','POST',{name:'POS connectivity',workload:'POS transactions',priority:'critical',primary_connection_id:connection.id});
if(policyResponse.status!==201)throw new Error('Connectivity policy creation failed');
const policy=(await policyResponse.json()).item;

const decisionResponse=await request('/api/connect/network/decision','POST',{policy_id:policy.id});
if(decisionResponse.status!==409)throw new Error('Routing must fail closed without a provider-verified connection');
const decision=(await decisionResponse.json()).decision;
if(!decision.fail_closed||decision.selected_connection!==null)throw new Error('Fail-closed decision contract is invalid');

const networkSnapshot=await request('/api/connect/network/snapshot');
const network=await networkSnapshot.json();
if(network.connections.length!==1||network.devices.length!==1||network.policies.length!==1)throw new Error('Network persistence failed');
if(network.audit.length<4)throw new Error('Network audit trail missing');

const unauthorizedHealth=await handleConnect(new Request('https://atlasenterprisesuite.com/api/connect/network/connections/'+connection.id+'/status',{method:'PATCH',headers:{...headers,authorization:'Bearer invalid'},body:JSON.stringify({status:'verified'})}),env);
if(unauthorizedHealth.status!==401)throw new Error('Provider health endpoint must reject unauthorized updates');

const outbound=await handleConnect(new Request('https://atlasenterprisesuite.com/api/connect/outbound',{method:'POST'}),env);
if(outbound.status!==503)throw new Error('Outbound must fail closed without provider credentials');

console.log('ATLAS Connect + Network Fabric smoke validation passed.');
