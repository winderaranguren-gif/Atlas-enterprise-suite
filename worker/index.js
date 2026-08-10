// ATLAS Cloudflare-native service layer
// CRM routes are backed by D1. Environment routes use server-side public weather data.
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json;charset=UTF-8','cache-control':'no-store',...extra}});
const id=()=>crypto.randomUUID();
const TYPES={accounts:'crm_accounts',contacts:'crm_contacts',leads:'crm_leads',opportunities:'crm_opportunities',tasks:'crm_tasks',activity:'crm_activity'};
const nwsHeaders={'Accept':'application/geo+json','User-Agent':'ATLAS Enterprise Suite (atlashealthfrontiers@gmail.com)'};
function phaseFromTimeZone(timeZone){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone,hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date());
 const h=Number(parts.find(x=>x.type==='hour')?.value||12)+Number(parts.find(x=>x.type==='minute')?.value||0)/60;
 if(h>=5&&h<7)return'dawn';if(h>=7&&h<16.5)return'day';if(h>=16.5&&h<18)return'golden';if(h>=18&&h<20)return'dusk';return'night';
}
function normalizeCondition(text=''){
 const v=String(text).toLowerCase();if(/thunder|storm|lightning/.test(v))return'storm';if(/rain|drizzle|shower/.test(v))return'rain';if(/snow|sleet|ice/.test(v))return'snow';if(/fog|mist|haze|smoke/.test(v))return'fog';if(/cloud|overcast/.test(v))return'cloudy';return'clear';
}
async function fetchJson(url){const r=await fetch(url,{headers:nwsHeaders});if(!r.ok)throw new Error(`weather_upstream_${r.status}`);return r.json();}
async function environment(request){
 const cf=request.cf||{};const lat=Number(cf.latitude);const lon=Number(cf.longitude);const timeZone=cf.timezone||'America/New_York';const location=[cf.city,cf.regionCode||cf.region,cf.country].filter(Boolean).join(', ')||'Local area';
 const base={location,timeZone,phase:phaseFromTimeZone(timeZone),source:'atlas-time'};
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||String(cf.country||'US').toUpperCase()!=='US')return json({...base,weather:'clear',condition:'Time-based environment',weatherAvailable:false});
 try{
  const point=await fetchJson(`https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`);
  const hourlyUrl=point?.properties?.forecastHourly;const stationsUrl=point?.properties?.observationStations;
  let hourly=null,obs=null;
  if(hourlyUrl){const h=await fetchJson(hourlyUrl);hourly=h?.properties?.periods?.[0]||null;}
  if(stationsUrl){const s=await fetchJson(stationsUrl);const station=s?.features?.[0]?.id;if(station){const o=await fetchJson(`${station}/observations/latest`);obs=o?.properties||null;}}
  const c=obs?.textDescription||hourly?.shortForecast||'Clear';const tempC=obs?.temperature?.value;const feelsC=obs?.heatIndex?.value??obs?.windChill?.value;const humidity=obs?.relativeHumidity?.value;const windKph=obs?.windSpeed?.value;const tempF=Number.isFinite(tempC)?Math.round(tempC*9/5+32):hourly?.temperature??null;const feelsF=Number.isFinite(feelsC)?Math.round(feelsC*9/5+32):null;
  return json({...base,source:'NWS/NOAA',weather:normalizeCondition(c),condition:c,temperature:tempF,temperatureUnit:'F',feelsLike:feelsF,humidity:Number.isFinite(humidity)?Math.round(humidity):null,windMph:Number.isFinite(windKph)?Math.round(windKph*0.621371):null,precipitationProbability:hourly?.probabilityOfPrecipitation?.value??null,weatherAvailable:true,updatedAt:new Date().toISOString()});
 }catch(error){return json({...base,weather:'clear',condition:'Live weather temporarily unavailable',weatherAvailable:false,error:String(error.message||error)},200);}
}

export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/api/environment'&&request.method==='GET')return environment(request);
  if(!url.pathname.startsWith('/api/crm/')) return env.ASSETS?env.ASSETS.fetch(request):new Response('Not found',{status:404});
  if(!env.DB) return json({operational:false,error:'D1 binding DB is not configured'},503);
  try{
   if(url.pathname==='/api/crm/health'){await env.DB.prepare('SELECT 1 AS ok').first();return json({operational:true,storage:'D1',service:'ATLAS CRM'});}
   const type=url.pathname.split('/').filter(Boolean)[2];const table=TYPES[type];if(!table)return json({error:'Unknown CRM resource'},404);
   const org=request.headers.get('x-atlas-organization')||'atlas';const dba=request.headers.get('x-atlas-dba')||'default';
   if(request.method==='GET'){const r=await env.DB.prepare(`SELECT * FROM ${table} WHERE organization_id=? AND dba_id=? ORDER BY updated_at DESC`).bind(org,dba).all();return json({[type]:r.results||[]});}
   if(request.method==='POST'){const body=await request.json();const recordId=id();const now=new Date().toISOString();await env.DB.prepare(`INSERT INTO ${table}(id,organization_id,dba_id,name,email,status,stage,owner,amount,payload,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).bind(recordId,org,dba,body.name||body.title||'',body.email||'',body.status||'active',body.stage||'new',body.owner||'',body.amount||null,JSON.stringify(body),now,now).run();await env.DB.prepare('INSERT INTO audit_log(id,organization_id,dba_id,action,resource_type,resource_id,payload,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(id(),org,dba,'create',type,recordId,JSON.stringify(body),now).run();return json({ok:true,id:recordId},201);}
   return json({error:'Method not allowed'},405);
  }catch(e){return json({operational:false,error:e.message},500)}
 }
};