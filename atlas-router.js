import baseWorker from './worker.js';
import {handleFinance} from './modules/finance-worker.js';
import {handleWeather} from './modules/weather-worker.js';

function decodeBase64Asset(text){
  const clean=text.trim();
  const raw=atob(clean);
  const bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++) bytes[i]=raw.charCodeAt(i);
  return bytes;
}

async function weatherImage(request,env){
  if(!env?.ASSETS) return new Response('Weather asset unavailable',{status:503});
  const assetUrl=new URL('/weather/current.webp.b64',request.url);
  const source=await env.ASSETS.fetch(new Request(assetUrl,request));
  if(!source.ok) return new Response('Weather asset unavailable',{status:source.status});
  const bytes=decodeBase64Asset(await source.text());
  return new Response(bytes,{headers:{'content-type':'image/webp','cache-control':'public, max-age=86400'}});
}

async function decorate(response){
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html')) return response;
  let html=await response.text();
  const sideNeedle='href="/climate"><span class="ico">☁</span>ATLAS Climate</a>';
  if(html.includes(sideNeedle) && !html.includes('href="/weather"')){
    html=html.replace(sideNeedle,sideNeedle+'<a class="nav" href="/weather"><span class="ico">☀</span>ATLAS Weather View</a>');
  }
  const footNeedle='<a href="/climate">☁ Climate</a>';
  if(html.includes(footNeedle) && !html.includes('href="/weather">☀ Weather')){
    html=html.replace(footNeedle,footNeedle+'<a href="/weather">☀ Weather</a>');
  }
  const headers=new Headers(response.headers);
  headers.set('content-length',String(new TextEncoder().encode(html).length));
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/weather/current.webp') return weatherImage(request,env);
    if(url.pathname==='/weather'){
      const response=await handleWeather(request,env,ctx);
      if(response) return response;
    }
    if(url.pathname==='/api/finance/capabilities'||url.pathname==='/api/finance/health'||url.pathname==='/finance'||url.pathname.startsWith('/finance/')){
      const response=await handleFinance(request,env,ctx);
      if(response) return decorate(response);
    }
    const response=await baseWorker.fetch(request,env,ctx);
    return decorate(response);
  },
  async scheduled(controller,env,ctx){
    if(typeof baseWorker.scheduled==='function') return baseWorker.scheduled(controller,env,ctx);
    ctx?.waitUntil?.(Promise.resolve());
    console.log('atlas_scheduled_ok',{cron:controller?.cron??null,scheduledTime:controller?.scheduledTime??null});
  }
};
