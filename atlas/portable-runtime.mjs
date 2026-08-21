import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import atlasApplication from '../rideos-router.js';

const ROOT=resolve(fileURLToPath(new URL('..',import.meta.url)));
const PUBLIC=resolve(ROOT,'public');
const MIME=new Map([
  ['.html','text/html; charset=utf-8'],['.htm','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.mjs','text/javascript; charset=utf-8'],
  ['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8'],['.svg','image/svg+xml'],['.png','image/png'],['.jpg','image/jpeg'],
  ['.jpeg','image/jpeg'],['.webp','image/webp'],['.gif','image/gif'],['.ico','image/x-icon'],['.txt','text/plain; charset=utf-8'],['.xml','application/xml; charset=utf-8'],
  ['.pdf','application/pdf'],['.woff','font/woff'],['.woff2','font/woff2'],['.mp3','audio/mpeg'],['.mp4','video/mp4']
]);

function contentType(path){return MIME.get(extname(path).toLowerCase())||'application/octet-stream';}
function runtimeJson(extra={}){return Response.json({ok:true,service:'ATLAS Portable Runtime',runtime:'node-web-standard',version:1,provider:process.env.ATLAS_RUNTIME_PROVIDER||'portable',durableObjects:'provider-adapter-required',assets:'local-public-directory',...extra},{headers:{'cache-control':'no-store'}});}
function requestOrigin(req,explicit){
  if(explicit)return explicit.replace(/\/$/,'');
  const proto=String(req.headers?.['x-forwarded-proto']||'http').split(',')[0].trim()||'http';
  const host=String(req.headers?.['x-forwarded-host']||req.headers?.host||'127.0.0.1').split(',')[0].trim();
  return `${proto}://${host}`;
}
async function readIncomingBody(req){
  if(req.method==='GET'||req.method==='HEAD')return undefined;
  const chunks=[];
  for await(const chunk of req)chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));
  return chunks.length?Buffer.concat(chunks):undefined;
}
function copyHeaders(input){
  const headers=new Headers();
  for(const [key,value] of Object.entries(input||{})){
    if(value===undefined)continue;
    if(Array.isArray(value))for(const item of value)headers.append(key,String(item));
    else headers.set(key,String(value));
  }
  return headers;
}
function normalizePath(value){
  const raw=String(value||'/');
  return raw.startsWith('/')?raw:`/${raw}`;
}
export async function nodeRequestToWeb(req,{origin,urlPath}={}){
  const base=requestOrigin(req,origin);
  const target=new URL(normalizePath(urlPath||req.url||'/'),`${base}/`);
  const body=await readIncomingBody(req);
  const init={method:req.method||'GET',headers:copyHeaders(req.headers),redirect:'manual'};
  if(body?.length)init.body=body;
  return new Request(target,init);
}

async function localAssetFetch(request){
  const url=new URL(request.url);
  let pathname;
  try{pathname=decodeURIComponent(url.pathname);}catch{return new Response('Bad asset path',{status:400});}
  const relative=pathname.replace(/^\/+/, '');
  if(!relative)return new Response('Asset not found',{status:404});
  let file=resolve(PUBLIC,relative);
  if(file!==PUBLIC&&!file.startsWith(PUBLIC+sep))return new Response('Forbidden',{status:403});
  try{
    const info=await stat(file);
    if(info.isDirectory())file=resolve(file,'index.html');
    const bytes=await readFile(file);
    return new Response(bytes,{headers:{'content-type':contentType(file),'cache-control':'public, max-age=300'}});
  }catch{return new Response('Asset not found',{status:404});}
}

export function createPortableEnv(overrides={}){
  return {...process.env,ASSETS:{fetch:localAssetFetch},ATLAS_RUNTIME_PROVIDER:process.env.ATLAS_RUNTIME_PROVIDER||'portable',...overrides};
}
export function createExecutionContext(){
  const pending=[];
  return {pending,waitUntil(value){pending.push(Promise.resolve(value));},passThroughOnException(){}};
}
export async function dispatchAtlasRequest(request,{env={},ctx}={}){
  const url=new URL(request.url);
  if(url.pathname==='/_atlas/runtime'||url.pathname==='/_atlas/health')return runtimeJson({path:url.pathname});
  const execution=ctx||createExecutionContext();
  try{
    const response=await atlasApplication.fetch(request,createPortableEnv(env),execution);
    if(!response)return new Response('ATLAS route not found',{status:404});
    if(execution.pending?.length)queueMicrotask(()=>Promise.allSettled(execution.pending).catch(()=>{}));
    const headers=new Headers(response.headers);
    headers.set('x-atlas-runtime','portable');
    headers.delete('content-length');
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  }catch(error){
    console.error('atlas_portable_dispatch_error',{path:url.pathname,message:error instanceof Error?error.message:String(error)});
    return Response.json({ok:false,error:'ATLAS portable runtime request failed',path:url.pathname},{status:500,headers:{'cache-control':'no-store','x-atlas-runtime':'portable'}});
  }
}

function setNodeHeaders(res,headers){
  const cookies=typeof headers.getSetCookie==='function'?headers.getSetCookie():[];
  for(const [name,value] of headers.entries()){
    if(name.toLowerCase()==='set-cookie')continue;
    res.setHeader(name,value);
  }
  if(cookies.length)res.setHeader('set-cookie',cookies);
}
export async function writeWebResponseToNode(response,res){
  res.statusCode=response.status;
  if(response.statusText)res.statusMessage=response.statusText;
  setNodeHeaders(res,response.headers);
  if(response.body===null||response.status===204||response.status===304){res.end();return;}
  const bytes=Buffer.from(await response.arrayBuffer());
  if(!res.hasHeader('content-length'))res.setHeader('content-length',String(bytes.length));
  res.end(bytes);
}
export async function handleNodeRequest(req,res,options={}){
  const request=await nodeRequestToWeb(req,options);
  const response=await dispatchAtlasRequest(request,{env:options.env||{}});
  await writeWebResponseToNode(response,res);
}
