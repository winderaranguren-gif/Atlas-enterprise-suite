(()=>{
'use strict';

const STATUS_URL='/api/gps/status';
const SEARCH_URL='/api/gps/search';
const ROUTE_URL='/api/gps/route';

async function jsonFetch(url,options={},timeoutMs=10000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(url,{...options,signal:controller.signal,headers:{accept:'application/json',...(options.headers||{})},cache:'no-store'});
    const payload=await response.json().catch(()=>null);
    if(!response.ok||!payload)throw new Error(payload?.error||`ATLAS GPS API ${response.status}`);
    return payload;
  }finally{clearTimeout(timer);}
}

function summaryText(summary={}){
  const meters=Number(summary.distanceMeters||0),seconds=Number(summary.durationSeconds||0);
  const distance=meters>=1000?`${(meters/1000).toFixed(1)} km`:`${Math.max(0,Math.round(meters))} m`;
  const minutes=Math.max(0,Math.round(seconds/60));
  return `${distance} · ${minutes} min`;
}

async function route({origin,destination,language}){
  if(!Array.isArray(origin)||origin.length<2)throw new Error(language==='es'?'Activa tu ubicación para usar enrutamiento del proveedor.':'Enable your location to use provider routing.');
  const params=new URLSearchParams({q:String(destination||'').slice(0,200),language:String(language||'en').slice(0,20),limit:'5'});
  const search=await jsonFetch(`${SEARCH_URL}?${params}`,{},8000);
  const target=Array.isArray(search.results)?search.results[0]:null;
  if(!target)throw new Error(language==='es'?'No se encontró ese destino.':'Destination was not found.');
  const result=await jsonFetch(ROUTE_URL,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({origin,destination:[target.longitude,target.latitude],language})
  },22000);
  return {geometry:result.geometry,summary:summaryText(result.summary),destination:target};
}

async function boot(){
  if(!window.ATLASGPS4D?.registerProvider)return;
  try{
    const status=await jsonFetch(STATUS_URL,{},5000);
    if(status?.providers?.search&&status?.providers?.routing){
      window.ATLASGPS4D.registerProvider({name:'ATLAS Cloud Routing',route});
    }
  }catch{
    // Local Core remains authoritative when the optional gateway is unavailable.
  }
}

if(window.ATLASGPS4D)boot();
else window.addEventListener('atlas:gps:ready',()=>boot(),{once:true});
})();
