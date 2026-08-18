const JSON_HEADERS={
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store',
  'x-content-type-options':'nosniff'
};

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:JSON_HEADERS});}

export async function handleVideoTurn(request,env){
  const url=new URL(request.url);
  if(url.pathname!=='/api/video/ice')return null;
  if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);
  const room=String(url.searchParams.get('room')||'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,80);
  if(!room)return json({ok:false,error:'room_required'},400);
  if(!env?.TURN_KEY_ID||!env?.TURN_KEY_API_TOKEN){
    return json({ok:false,error:'turn_not_provisioned',iceServers:[{urls:['stun:stun.cloudflare.com:3478']}]},503);
  }
  try{
    const upstream=await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(env.TURN_KEY_ID)}/credentials/generate-ice-servers`,{
      method:'POST',
      headers:{'Authorization':`Bearer ${env.TURN_KEY_API_TOKEN}`,'Content-Type':'application/json'},
      body:JSON.stringify({ttl:3600})
    });
    const body=await upstream.json().catch(()=>null);
    if(!upstream.ok||!body?.iceServers)return json({ok:false,error:'turn_upstream_failed',status:upstream.status},502);
    const iceServers=body.iceServers.map(server=>{
      const urls=Array.isArray(server.urls)?server.urls.filter(u=>!String(u).includes(':53')):server.urls;
      return {...server,urls};
    });
    return json({ok:true,provider:'cloudflare-realtime-turn',ttl:3600,iceServers});
  }catch(e){
    return json({ok:false,error:'turn_exception'},502);
  }
}
