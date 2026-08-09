const JSON_HEADERS = {'content-type':'application/json; charset=utf-8'};
const MAX_FILES = 60;
const MAX_FILE_BYTES = 262144;
const MAX_TOTAL_BYTES = 2 * 1024 * 1024;
const PROTECTED_PREFIXES = ['.github/','cloudflare/','.git/'];
const PROTECTED_FILES = new Set(['wrangler.jsonc','wrangler.toml','package.json','package-lock.json','SECURITY.md']);

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:JSON_HEADERS});}
function fail(message,status=400,code='invalid_request'){return json({ok:false,code,message},status);}
function safePath(path){
  if(typeof path!=='string'||!path||path.startsWith('/')||path.includes('..')||path.includes('\\')) return false;
  if(PROTECTED_FILES.has(path)||PROTECTED_PREFIXES.some(prefix=>path.startsWith(prefix))) return false;
  return true;
}
function b64Utf8(value){
  const bytes=new TextEncoder().encode(value); let binary='';
  for(const byte of bytes) binary+=String.fromCharCode(byte);
  return btoa(binary);
}
async function github(env,path,init={}){
  const response=await fetch(`https://api.github.com${path}`,{
    ...init,
    headers:{
      'accept':'application/vnd.github+json',
      'authorization':`Bearer ${env.GITHUB_TOKEN}`,
      'x-github-api-version':'2022-11-28',
      'user-agent':'atlas-cloudflare-github-bridge',
      ...(init.headers||{})
    }
  });
  const text=await response.text();
  let body=null; try{body=text?JSON.parse(text):null;}catch{body={raw:text};}
  if(!response.ok){const error=new Error(body?.message||`GitHub ${response.status}`);error.status=response.status;error.body=body;throw error;}
  return body;
}
function authorized(request,env){
  const header=request.headers.get('authorization')||'';
  return env.ATLAS_BRIDGE_SHARED_SECRET && header===`Bearer ${env.ATLAS_BRIDGE_SHARED_SECRET}`;
}
async function getRef(env,ref){
  const owner=env.GITHUB_OWNER,repo=env.GITHUB_REPO;
  return github(env,`/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(ref)}`);
}
async function ensureBranch(env,base,branch){
  try{return await getRef(env,branch);}catch(error){if(error.status!==404)throw error;}
  const baseRef=await getRef(env,base);
  return github(env,`/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/git/refs`,{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({ref:`refs/heads/${branch}`,sha:baseRef.object.sha})
  });
}
async function contentSha(env,path,branch){
  const owner=env.GITHUB_OWNER,repo=env.GITHUB_REPO;
  try{
    const data=await github(env,`/repos/${owner}/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branch)}`);
    return data?.sha||null;
  }catch(error){if(error.status===404)return null;throw error;}
}
async function putFile(env,file,branch,runId){
  const owner=env.GITHUB_OWNER,repo=env.GITHUB_REPO;
  const sha=await contentSha(env,file.path,branch);
  const payload={message:`[atlas-bridge] ${runId}: ${file.path}`,content:b64Utf8(file.content),branch};
  if(sha)payload.sha=sha;
  return github(env,`/repos/${owner}/${repo}/contents/${file.path.split('/').map(encodeURIComponent).join('/')}`,{
    method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(payload)
  });
}
async function openPullRequest(env,branch,base,title,body){
  const owner=env.GITHUB_OWNER,repo=env.GITHUB_REPO;
  return github(env,`/repos/${owner}/${repo}/pulls`,{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({title,head:branch,base,body,draft:true,maintainer_can_modify:true})
  });
}
async function handleSync(request,env){
  if(!authorized(request,env))return fail('Unauthorized',401,'unauthorized');
  if(!env.GITHUB_TOKEN||!env.GITHUB_OWNER||!env.GITHUB_REPO)return fail('Bridge environment is incomplete',503,'bridge_not_configured');
  let payload; try{payload=await request.json();}catch{return fail('Body must be valid JSON');}
  const files=Array.isArray(payload.files)?payload.files:[];
  if(!files.length||files.length>MAX_FILES)return fail(`files must contain 1-${MAX_FILES} entries`);
  let total=0;
  for(const file of files){
    if(!safePath(file?.path))return fail(`Path is not allowed: ${file?.path||'(missing)'}`);
    if(typeof file.content!=='string')return fail(`Content must be UTF-8 text: ${file.path}`);
    const bytes=new TextEncoder().encode(file.content).byteLength;
    if(bytes>MAX_FILE_BYTES)return fail(`File too large: ${file.path}`);
    total+=bytes;
  }
  if(total>MAX_TOTAL_BYTES)return fail('Bundle exceeds maximum total size');
  const base=env.GITHUB_BASE_BRANCH||'main';
  const runId=String(payload.runId||crypto.randomUUID()).replace(/[^a-zA-Z0-9._-]/g,'-').slice(0,64);
  const branch=`cloudflare-sync/${runId}`;
  if(payload.dryRun===true)return json({ok:true,dryRun:true,runId,branch,base,files:files.map(f=>f.path),bytes:total});
  await ensureBranch(env,base,branch);
  const results=[];
  for(const file of files){const result=await putFile(env,file,branch,runId);results.push({path:file.path,commit:result?.commit?.sha||null});}
  const pr=await openPullRequest(env,branch,base,payload.title||`ATLAS Cloudflare sync ${runId}`,payload.description||`Generated by the ATLAS Cloudflare→GitHub bridge.\n\nRun: ${runId}\nFiles: ${files.length}\n\nProtected infrastructure paths are intentionally excluded.`);
  return json({ok:true,runId,branch,base,files:results,pullRequest:{number:pr.number,url:pr.html_url,draft:pr.draft}});
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(request.method==='GET'&&url.pathname==='/healthz')return json({ok:true,service:'ATLAS Cloudflare GitHub Bridge',configured:Boolean(env.GITHUB_TOKEN&&env.GITHUB_OWNER&&env.GITHUB_REPO&&env.ATLAS_BRIDGE_SHARED_SECRET)});
    if(request.method==='POST'&&url.pathname==='/sync'){
      try{return await handleSync(request,env);}catch(error){return json({ok:false,code:'bridge_error',message:error.message,status:error.status||500,github:error.body||undefined},error.status&&error.status<600?error.status:500);}
    }
    return fail('Not found',404,'not_found');
  }
};
