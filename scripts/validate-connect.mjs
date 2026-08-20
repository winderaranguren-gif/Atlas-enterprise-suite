import {ConnectStore,handleConnect} from '../modules/connect-worker.js';

class MemoryStorage{
  constructor(){this.data=new Map();}
  async get(key){return this.data.get(key);}
  async put(key,value){this.data.set(key,structuredClone(value));}
}
const instance=new ConnectStore({storage:new MemoryStorage()});
const env={CONNECT_STORE:{idFromName:name=>name,get:()=>({fetch:request=>instance.fetch(request instanceof Request?request:new Request(request))})}};

for(const path of ['/connect','/connect/inbox','/connect/contacts','/connect/routing','/connect/tasks','/connect/settings']){
  const response=await handleConnect(new Request('https://atlasenterprisesuite.com'+path),env);
  if(!response||response.status!==200)throw new Error('Connect route failed: '+path);
  if(!(await response.text()).includes('ATLAS Connect'))throw new Error('Connect identity missing: '+path);
}
const status=await handleConnect(new Request('https://atlasenterprisesuite.com/api/connect/status'),env);
const statusBody=await status.json();
if(statusBody.telephony.configured!==false)throw new Error('Unconfigured provider must not report connected');

const create=await handleConnect(new Request('https://atlasenterprisesuite.com/api/connect/conversations',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({channel:'note',contact_name:'Validation Contact',subject:'Smoke test',body:'A real internal interaction record.'})}),env);
if(create.status!==201)throw new Error('Conversation creation failed');
const snapshot=await handleConnect(new Request('https://atlasenterprisesuite.com/api/connect/snapshot'),env);
const data=await snapshot.json();
if(data.conversations.length!==1)throw new Error('Conversation persistence failed');
const outbound=await handleConnect(new Request('https://atlasenterprisesuite.com/api/connect/outbound',{method:'POST'}),env);
if(outbound.status!==503)throw new Error('Outbound must fail closed without provider credentials');

console.log('ATLAS Connect smoke validation passed.');
