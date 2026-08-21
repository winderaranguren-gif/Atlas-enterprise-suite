import { execFileSync } from 'node:child_process';

function parse(args){
  const positional=[];const flags={};
  for(let i=0;i<args.length;i++){
    const value=args[i];
    if(!value.startsWith('--')){positional.push(value);continue;}
    const key=value.slice(2);const next=args[i+1];
    if(next&&!next.startsWith('--'))flags[key]=args[++i];else flags[key]=true;
  }
  return {positional,flags};
}

function out(value,code=0){console.log(JSON.stringify(value,null,2));process.exitCode=code;}
function safeRepo(value){const repo=String(value||'').trim();if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo))throw new Error('Repository must be owner/name');return repo;}
function safeBranch(value){const branch=String(value||'').trim();if(!branch||branch.length>240||/[~^:?*\[\\\s]/.test(branch)||branch.includes('..')||branch.endsWith('/')||branch.startsWith('/'))throw new Error('Invalid branch name');return branch;}
function token(){return process.env.GITHUB_TOKEN||process.env.GH_TOKEN||'';}
function authHeaders(){const value=token();return {'accept':'application/vnd.github+json','x-github-api-version':'2022-11-28',...(value?{authorization:`Bearer ${value}`}:{})};}
async function github(path,options={}){
  const response=await fetch(`https://api.github.com${path}`,{...options,headers:{...authHeaders(),...(options.headers||{})}});
  const text=await response.text();let body=null;try{body=text?JSON.parse(text):null}catch{body={message:text};}
  if(!response.ok)throw new Error(`GitHub ${response.status}: ${body?.message||'request failed'}`);
  return {status:response.status,body};
}
function currentRepo(){
  if(process.env.GITHUB_REPOSITORY)return process.env.GITHUB_REPOSITORY;
  try{
    const url=execFileSync('git',['config','--get','remote.origin.url'],{encoding:'utf8'}).trim();
    const match=url.match(/github\.com[/:]([^/]+\/[^/.]+)(?:\.git)?$/i);
    return match?match[1]:null;
  }catch{return null;}
}
function plan(operation,repo,input={}){
  return {service:'ATLAS Git Gateway',operation,repo,input,apply:false,auditRequired:true,tenantScoped:true,secretValuesLogged:false};
}

const [cmd,...raw]=process.argv.slice(2);const {positional,flags}=parse(raw);
try{
  if(cmd==='status'){
    out({service:'ATLAS Git Gateway',version:1,provider:'github',repository:flags.repo||currentRepo(),authenticated:Boolean(token()),mutationDefault:'dry-run',auditRequired:true});
  }else if(cmd==='branches'){
    const repo=safeRepo(flags.repo||currentRepo());
    if(flags.plan){out(plan('branches.list',repo));}
    else{
      const {body}=await github(`/repos/${repo}/branches?per_page=${Math.min(100,Number(flags.limit)||30)}`);
      out({service:'ATLAS Git Gateway',repo,branches:body.map(x=>({name:x.name,sha:x.commit?.sha,protected:Boolean(x.protected)}))});
    }
  }else if(cmd==='branch-create'){
    const repo=safeRepo(flags.repo||currentRepo());const branch=safeBranch(positional[0]);const from=safeBranch(flags.from||'main');
    if(!flags.apply){out(plan('branch.create',repo,{branch,from}));}
    else{
      if(!token())throw new Error('GITHUB_TOKEN or GH_TOKEN is required for remote mutation');
      const {body:base}=await github(`/repos/${repo}/git/ref/heads/${encodeURIComponent(from)}`);
      const {body}=await github(`/repos/${repo}/git/refs`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({ref:`refs/heads/${branch}`,sha:base.object.sha})});
      out({service:'ATLAS Git Gateway',operation:'branch.create',applied:true,repo,branch,sha:body.object?.sha});
    }
  }else if(cmd==='pr-create'){
    const repo=safeRepo(flags.repo||currentRepo());const head=safeBranch(flags.head);const base=safeBranch(flags.base||'main');const title=String(flags.title||'').trim();if(!title)throw new Error('--title is required');const body=String(flags.body||'');
    if(!flags.apply){out(plan('pull_request.create',repo,{head,base,title,body,draft:Boolean(flags.draft)}));}
    else{
      if(!token())throw new Error('GITHUB_TOKEN or GH_TOKEN is required for remote mutation');
      const {body:pr}=await github(`/repos/${repo}/pulls`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({head,base,title,body,draft:Boolean(flags.draft)})});
      out({service:'ATLAS Git Gateway',operation:'pull_request.create',applied:true,repo,number:pr.number,url:pr.html_url,state:pr.state});
    }
  }else if(cmd==='pr-merge'){
    const repo=safeRepo(flags.repo||currentRepo());const number=Number(positional[0]);if(!Number.isInteger(number)||number<1)throw new Error('PR number is required');const method=['merge','squash','rebase'].includes(flags.method)?flags.method:'squash';
    if(!flags.apply){out(plan('pull_request.merge',repo,{number,method}));}
    else{
      if(!token())throw new Error('GITHUB_TOKEN or GH_TOKEN is required for remote mutation');
      const {body}=await github(`/repos/${repo}/pulls/${number}/merge`,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({merge_method:method})});
      out({service:'ATLAS Git Gateway',operation:'pull_request.merge',applied:true,repo,number,merged:Boolean(body.merged),sha:body.sha||null,message:body.message||null});
    }
  }else if(cmd==='plan'){
    const operation=String(positional[0]||'').trim();const repo=safeRepo(flags.repo||currentRepo());if(!operation)throw new Error('Operation is required');let input={};if(flags.json){try{input=JSON.parse(String(flags.json));}catch{throw new Error('--json must be valid JSON');}}out(plan(operation,repo,input));
  }else{
    console.error('ATLAS Git Gateway\n\nUsage:\n  node atlas/git-gateway.mjs status [--repo owner/name]\n  node atlas/git-gateway.mjs branches [--repo owner/name] [--plan]\n  node atlas/git-gateway.mjs branch-create <branch> [--from main] [--repo owner/name] [--apply]\n  node atlas/git-gateway.mjs pr-create --head BRANCH --base main --title TITLE [--body TEXT] [--draft] [--repo owner/name] [--apply]\n  node atlas/git-gateway.mjs pr-merge <number> [--method squash] [--repo owner/name] [--apply]\n  node atlas/git-gateway.mjs plan <operation> --repo owner/name [--json PAYLOAD]');
    process.exitCode=2;
  }
}catch(error){out({service:'ATLAS Git Gateway',ok:false,error:error instanceof Error?error.message:String(error)},1);}
