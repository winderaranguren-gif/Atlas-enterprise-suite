export function json(data,status=200){
  return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
}

export async function health(env){
  const bindings={
    d1:Boolean(env.DB),
    r2:Boolean(env.BACKUPS),
    assets:Boolean(env.ASSETS)
  };
  let d1Reachable=false;
  if(env.DB){
    try{ await env.DB.prepare('SELECT 1 AS ok').first(); d1Reachable=true; }catch{}
  }
  return {
    service:'ATLAS',
    runtime:'cloudflare-worker',
    deployedSha:env.ATLAS_DEPLOYED_SHA||null,
    defaultLanguage:env.ATLAS_DEFAULT_LANGUAGE||'en',
    bindings,
    d1Reachable,
    operational:false,
    status:'core-baseline'
  };
}
