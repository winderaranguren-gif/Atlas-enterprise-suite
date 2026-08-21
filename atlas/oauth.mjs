import { createHash, randomBytes } from 'node:crypto';

function base64url(buffer){return buffer.toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');}
function parse(args){const positional=[];const flags={};for(let i=0;i<args.length;i++){const value=args[i];if(!value.startsWith('--')){positional.push(value);continue;}const key=value.slice(2);const next=args[i+1];if(next&&!next.startsWith('--'))flags[key]=args[++i];else flags[key]=true;}return{positional,flags};}
function out(value,code=0){console.log(JSON.stringify(value,null,2));process.exitCode=code;}

const [cmd,...raw]=process.argv.slice(2);
const {flags}=parse(raw);

try{
  if(cmd==='pkce'){
    const verifier=base64url(randomBytes(48));
    const challenge=base64url(createHash('sha256').update(verifier).digest());
    const state=base64url(randomBytes(24));
    const authUrl=flags['auth-url']?new URL(String(flags['auth-url'])):null;
    if(authUrl){
      if(flags['client-id'])authUrl.searchParams.set('client_id',String(flags['client-id']));
      if(flags['redirect-uri'])authUrl.searchParams.set('redirect_uri',String(flags['redirect-uri']));
      if(flags.scope)authUrl.searchParams.set('scope',String(flags.scope));
      authUrl.searchParams.set('response_type',String(flags['response-type']||'code'));
      authUrl.searchParams.set('code_challenge_method','S256');
      authUrl.searchParams.set('code_challenge',challenge);
      authUrl.searchParams.set('state',state);
    }
    out({
      service:'ATLAS OAuth Broker',
      mode:'pkce-local',
      verifier,
      challenge,
      method:'S256',
      state,
      authorizationUrl:authUrl?authUrl.toString():null,
      policy:{persistedByTool:false,clientSecretRequired:false,tokenExchangePerformed:false}
    });
  }else if(cmd==='status'){
    out({service:'ATLAS OAuth Broker',version:1,pkce:true,tokenPersistence:false,clientSecretStorage:false,webCallback:false});
  }else{
    console.error('ATLAS OAuth Broker\n\nUsage:\n  node atlas/oauth.mjs status\n  node atlas/oauth.mjs pkce [--auth-url URL] [--client-id ID] [--redirect-uri URL] [--scope "a b"]');
    process.exitCode=2;
  }
}catch(error){out({service:'ATLAS OAuth Broker',ok:false,error:error instanceof Error?error.message:String(error)},1);}
