function json(body,status=200){
  return new Response(JSON.stringify(body),{
    status,
    headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
  });
}

function configured(value){
  return Boolean(String(value||'').trim());
}

export async function liveCommerceRoutes(request,env,url){
  if(url.pathname==='/api/live-commerce/status' && request.method==='GET'){
    const tiktokClientConfigured=configured(env.TIKTOK_CLIENT_KEY);
    const tiktokShopConfigured=configured(env.TIKTOK_SHOP_APP_KEY);
    const obsBridgeConfigured=configured(env.ATLAS_OBS_BRIDGE_URL);

    return json({
      ok:true,
      module:'ATLAS Live Commerce & Investor Studio',
      mode:'control-room',
      integrations:{
        tiktokDeveloper:{configured:tiktokClientConfigured,status:tiktokClientConfigured?'configured':'not_connected'},
        tiktokShop:{configured:tiktokShopConfigured,status:tiktokShopConfigured?'configured':'not_connected'},
        obsBridge:{configured:obsBridgeConfigured,status:obsBridgeConfigured?'configured':'not_connected'}
      },
      workflow:['prepare','review','approve','publish'],
      monetization:{
        sales:'supported_when_provider_connected',
        donations:'separate_flow_required',
        investorInterest:'lead_capture_only'
      },
      secretsInSource:false
    });
  }

  return null;
}
