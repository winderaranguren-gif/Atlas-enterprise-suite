const MAX_GPS_BODY_BYTES=16384;
const MAX_UPSTREAM_BYTES=2*1024*1024;
const MAX_ROUTE_POINTS=5000;

function json(payload,status=200){
  return new Response(JSON.stringify(payload),{status,headers:{'Content-Type':'application/json; charset=utf-8'}});
}

function configuredUrl(value){
  if(!value)return null;
  try{
    const url=new URL(String(value));
    return url.protocol==='https:'?url:null;
  }catch{return null;}
}

async function readBody(request){
  if(!request.body)throw new Error('invalid_json');
  const reader=request.body.getReader();
  const decoder=new TextDecoder();
  let bytes=0,text='';
  while(true){
    const {done,value}=await reader.read();
    if(done)break;
    bytes+=value?.byteLength||0;
    if(bytes>MAX_GPS_BODY_BYTES){try{await reader.cancel();}catch{}throw new Error('payload_too_large');}
    text+=decoder.decode(value,{stream:true});
  }
  text+=decoder.decode();
  const body=JSON.parse(text);
  if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('invalid_payload');
  return body;
}

async function fetchJson(url,options={},timeoutMs=10000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(url,{...options,signal:controller.signal,headers:{accept:'application/json',...(options.headers||{})}});
    if(!response.ok)throw new Error(`upstream_${response.status}`);
    const declared=Number(response.headers.get('content-length')||0);
    if(declared>MAX_UPSTREAM_BYTES)throw new Error('upstream_too_large');
    const text=await response.text();
    if(new TextEncoder().encode(text).byteLength>MAX_UPSTREAM_BYTES)throw new Error('upstream_too_large');
    return JSON.parse(text);
  }finally{clearTimeout(timer);}
}

function coordinate(value){
  const pair=Array.isArray(value)?value:[value?.lon??value?.longitude,value?.lat??value?.latitude];
  const lon=Number(pair[0]),lat=Number(pair[1]);
  if(!Number.isFinite(lon)||lon < -180||lon > 180||!Number.isFinite(lat)||lat < -90||lat > 90)throw new Error('invalid_coordinate');
  return {lon,lat};
}

function normalizeGeometry(raw){
  const source=Array.isArray(raw)?raw:Array.isArray(raw?.coordinates)?raw.coordinates:[];
  const out=[];
  for(const point of source.slice(0,MAX_ROUTE_POINTS)){
    if(!Array.isArray(point)||point.length<2)continue;
    const lon=Number(point[0]),lat=Number(point[1]);
    if(Number.isFinite(lon)&&lon>=-180&&lon<=180&&Number.isFinite(lat)&&lat>=-90&&lat<=90)out.push([lon,lat]);
  }
  return out;
}

function status(env,base){
  return json({...base,ok:true,service:'ATLAS GPS Provider Gateway',version:'1.0.0',providers:{search:Boolean(configuredUrl(env.ATLAS_GPS_SEARCH_URL)),routing:Boolean(configuredUrl(env.ATLAS_GPS_ROUTER_URL))},policy:{sameOrigin:true,browserSecrets:false,localFallback:true}});
}

async function search(url,env,base){
  const upstream=configuredUrl(env.ATLAS_GPS_SEARCH_URL);
  if(!upstream)return json({...base,ok:false,error:'search_provider_not_configured'},503);
  const q=String(url.searchParams.get('q')||'').trim().slice(0,200);
  if(q.length<2)return json({...base,ok:false,error:'invalid_query'},400);
  const language=String(url.searchParams.get('language')||'en').slice(0,20);
  const limit=Math.min(Math.max(Number(url.searchParams.get('limit')||5),1),10);
  upstream.searchParams.set('q',q);
  upstream.searchParams.set('format','jsonv2');
  upstream.searchParams.set('addressdetails','1');
  upstream.searchParams.set('limit',String(limit));
  upstream.searchParams.set('accept-language',language);
  const raw=await fetchJson(upstream,{},8000);
  const results=(Array.isArray(raw)?raw:[]).slice(0,limit).map(item=>({
    id:String(item.place_id||item.osm_id||`${item.lon}:${item.lat}`),
    label:String(item.display_name||item.name||'Destination').slice(0,500),
    longitude:Number(item.lon),latitude:Number(item.lat)
  })).filter(item=>Number.isFinite(item.longitude)&&item.longitude>=-180&&item.longitude<=180&&Number.isFinite(item.latitude)&&item.latitude>=-90&&item.latitude<=90);
  return json({...base,ok:true,query:q,results});
}

async function route(request,env,base){
  const upstream=configuredUrl(env.ATLAS_GPS_ROUTER_URL);
  if(!upstream)return json({...base,ok:false,error:'routing_provider_not_configured'},503);
  const body=await readBody(request);
  const origin=coordinate(body.origin),destination=coordinate(body.destination);
  const language=String(body.language||'en-US').slice(0,20);
  const payload={locations:[{lat:origin.lat,lon:origin.lon,type:'break'},{lat:destination.lat,lon:destination.lon,type:'break'}],costing:'auto',units:'kilometers',directions_options:{units:'kilometers',language},shape_format:'geojson'};
  upstream.searchParams.set('json',JSON.stringify(payload));
  const raw=await fetchJson(upstream,{},20000);
  const trip=raw?.trip||{};
  const legs=Array.isArray(trip.legs)?trip.legs:[];
  const geometry=normalizeGeometry(legs.flatMap(leg=>leg?.shape?.type==='LineString'?leg.shape.coordinates||[]:Array.isArray(leg?.shape)?leg.shape:[]));
  if(geometry.length<2)return json({...base,ok:false,error:'provider_route_empty'},502);
  const km=Number(trip.summary?.length||0),seconds=Number(trip.summary?.time||0);
  return json({...base,ok:true,geometry,summary:{distanceMeters:Number.isFinite(km)?Math.round(km*1000):0,durationSeconds:Number.isFinite(seconds)?Math.round(seconds):0},provider:'atlas-server-configured-router'});
}

export async function handleGpsApi(request,url,env,base){
  try{
    if(request.method==='GET'&&url.pathname==='/api/gps/status')return status(env,base);
    if(request.method==='GET'&&url.pathname==='/api/gps/search')return await search(url,env,base);
    if(request.method==='POST'&&url.pathname==='/api/gps/route')return await route(request,env,base);
    return null;
  }catch(error){
    const code=error?.message||'gps_gateway_failure';
    const statusCode=code==='payload_too_large'?413:/invalid_|JSON/.test(code)?400:502;
    return json({...base,ok:false,error:code},statusCode);
  }
}
