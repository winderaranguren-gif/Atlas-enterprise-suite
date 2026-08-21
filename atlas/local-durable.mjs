import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { ConnectStore, CapabilityStateStore, WalletStore } from '../rideos-router.js';

const DEFAULT_ROOT=resolve(process.cwd(),'.atlas','runtime-state');
const safeName=value=>String(value||'state').replace(/[^A-Za-z0-9._-]/g,'_').slice(0,80)||'state';
const digest=value=>createHash('sha256').update(String(value)).digest('hex');
const clone=value=>value===undefined?undefined:structuredClone(value);

class JsonDurableStorage{
  constructor(namespace,id,{root}={}){
    this.namespace=safeName(namespace);
    this.id=digest(id);
    this.root=resolve(root||process.env.ATLAS_STATE_DIR||DEFAULT_ROOT);
    this.dir=join(this.root,this.namespace);
    this.file=join(this.dir,`${this.id}.json`);
    this.loaded=false;
    this.rows=new Map();
    this.writeQueue=Promise.resolve();
  }
  async ensureLoaded(){
    if(this.loaded)return;
    await mkdir(this.dir,{recursive:true,mode:0o700});
    try{
      const parsed=JSON.parse(await readFile(this.file,'utf8'));
      this.rows=new Map(Object.entries(parsed&&typeof parsed==='object'?parsed:{}));
    }catch{this.rows=new Map();}
    this.loaded=true;
  }
  async persist(){
    const payload=JSON.stringify(Object.fromEntries(this.rows),null,2);
    const temp=`${this.file}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temp,payload,{encoding:'utf8',mode:0o600});
    await rename(temp,this.file);
  }
  async mutate(fn){
    const operation=this.writeQueue.then(async()=>{await this.ensureLoaded();const result=await fn();await this.persist();return result;});
    this.writeQueue=operation.catch(()=>{});
    return operation;
  }
  async get(key){await this.ensureLoaded();if(Array.isArray(key))return new Map(key.filter(k=>this.rows.has(k)).map(k=>[k,clone(this.rows.get(k))]));return clone(this.rows.get(String(key)));}
  async put(key,value){
    if(key&&typeof key==='object'&&!Array.isArray(key)&&value===undefined){return this.mutate(()=>{for(const [k,v] of Object.entries(key))this.rows.set(k,clone(v));});}
    return this.mutate(()=>{this.rows.set(String(key),clone(value));});
  }
  async delete(key){
    return this.mutate(()=>{
      if(Array.isArray(key)){let count=0;for(const k of key)if(this.rows.delete(String(k)))count++;return count;}
      return this.rows.delete(String(key));
    });
  }
  async list({prefix='',limit=1000}={}){
    await this.ensureLoaded();
    const out=new Map();
    for(const key of [...this.rows.keys()].sort()){
      if(prefix&&!key.startsWith(prefix))continue;
      out.set(key,clone(this.rows.get(key)));
      if(out.size>=limit)break;
    }
    return out;
  }
}

class LocalDurableNamespace{
  constructor(name,Class,{root}={}){this.name=name;this.Class=Class;this.root=root;this.instances=new Map();}
  idFromName(name){return {name:String(name),namespace:this.name};}
  get(id){
    const name=typeof id==='string'?id:String(id?.name||id||'default');
    const hashed=digest(name);
    let instance=this.instances.get(hashed);
    if(!instance){
      const storage=new JsonDurableStorage(this.name,name,{root:this.root});
      const state={storage};
      const object=new this.Class(state,{});
      instance={fetch:async(input,init)=>object.fetch(input instanceof Request?input:new Request(input,init))};
      this.instances.set(hashed,instance);
    }
    return instance;
  }
}

export function createLocalDurableBindings({root}={}){
  return {
    CONNECT_STORE:new LocalDurableNamespace('connect',ConnectStore,{root}),
    CAPABILITY_STATE_STORE:new LocalDurableNamespace('capability-state',CapabilityStateStore,{root}),
    WALLET_STORE:new LocalDurableNamespace('wallet',WalletStore,{root})
  };
}

export function localDurableStateEnabled(){
  if(String(process.env.ATLAS_PORTABLE_STATE||'').toLowerCase()==='off')return false;
  if(process.env.VERCEL||process.env.AWS_LAMBDA_FUNCTION_NAME)return String(process.env.ATLAS_PORTABLE_STATE||'').toLowerCase()==='local';
  return true;
}

export function localDurableStateInfo(){
  const enabled=localDurableStateEnabled();
  return {
    enabled,
    mode:enabled?'local-json-durable':'external-adapter-required',
    customStateDirectory:Boolean(process.env.ATLAS_STATE_DIR),
    namespaces:['CONNECT_STORE','CAPABILITY_STATE_STORE','WALLET_STORE'],
    videoSignaling:'external-websocket-adapter-required'
  };
}
