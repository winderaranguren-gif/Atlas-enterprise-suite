const JSON_HEADERS={
  'content-type':'application/json; charset=utf-8',
  'cache-control':'public, max-age=180',
  'access-control-allow-origin':'*',
  'access-control-allow-methods':'GET,HEAD,OPTIONS',
  'access-control-allow-headers':'content-type,authorization'
};

function clamp(value,min,max,fallback){
  const number=Number(value);
  return Number.isFinite(number)?Math.max(min,Math.min(max,number)):fallback;
}

function json(data,status=200,headers={}){
  return new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,...headers}});
}

function weatherUrl(lat,lon){
  const q=new URL('https://api.open-meteo.com/v1/forecast');
  q.searchParams.set('latitude',String(lat));
  q.searchParams.set('longitude',String(lon));
  q.searchParams.set('temperature_unit','fahrenheit');
  q.searchParams.set('wind_speed_unit','mph');
  q.searchParams.set('precipitation_unit','inch');
  q.searchParams.set('timezone','auto');
  q.searchParams.set('forecast_days','10');
  q.searchParams.set('forecast_hours','48');
  q.searchParams.set('current','temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure');
  q.searchParams.set('hourly','temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,precipitation,weather_code,visibility,dew_point_2m,uv_index,surface_pressure,wind_speed_10m,wind_direction_10m');
  q.searchParams.set('minutely_15','precipitation,weather_code');
  q.searchParams.set('forecast_minutely_15','24');
  q.searchParams.set('daily','weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset');
  return q;
}

function airQualityUrl(lat,lon){
  const q=new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  q.searchParams.set('latitude',String(lat));
  q.searchParams.set('longitude',String(lon));
  q.searchParams.set('timezone','auto');
  q.searchParams.set('forecast_days','2');
  q.searchParams.set('hourly','us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen');
  return q;
}

async function fetchJson(url,headers={}){
  const response=await fetch(url,{headers:{'user-agent':'ATLAS-Enterprise-Suite/1.0 (+https://www.atlasenterprisesuite.com)',...headers}});
  if(!response.ok)throw new Error(`provider_${response.status}`);
  return response.json();
}

function airSnapshot(data){
  const hourly=data?.hourly||{};
  const first=name=>Array.isArray(hourly[name])?hourly[name].find(value=>value!=null)??null:null;
  const pollen={
    alder:first('alder_pollen'),
    birch:first('birch_pollen'),
    grass:first('grass_pollen'),
    mugwort:first('mugwort_pollen'),
    olive:first('olive_pollen'),
    ragweed:first('ragweed_pollen')
  };
  return {
    aqi:first('us_aqi'),
    pm25:first('pm2_5'),
    pm10:first('pm10'),
    ozone:first('ozone'),
    nitrogenDioxide:first('nitrogen_dioxide'),
    pollen,
    hourly
  };
}

async function nwsAlerts(lat,lon){
  try{
    const endpoint=new URL('https://api.weather.gov/alerts/active');
    endpoint.searchParams.set('point',`${lat},${lon}`);
    const data=await fetchJson(endpoint,{'accept':'application/geo+json'});
    return (Array.isArray(data?.features)?data.features:[]).slice(0,8).map(feature=>{
      const p=feature?.properties||{};
      return {
        id:feature?.id||p.id||null,
        event:p.event||'Weather alert',
        headline:p.headline||p.event||'Weather alert',
        severity:p.severity||'Unknown',
        urgency:p.urgency||'Unknown',
        description:p.description||'',
        instruction:p.instruction||'',
        effective:p.effective||null,
        expires:p.expires||null,
        source:'National Weather Service'
      };
    });
  }catch(_){
    return [];
  }
}

async function aggregateWeather(url){
  const lat=clamp(url.searchParams.get('lat'),-90,90,28.5383);
  const lon=clamp(url.searchParams.get('lon'),-180,180,-81.3792);
  const forecastPromise=fetchJson(weatherUrl(lat,lon));
  const airPromise=fetchJson(airQualityUrl(lat,lon));
  const alertsPromise=nwsAlerts(lat,lon);
  const [forecastResult,airResult,alertsResult]=await Promise.allSettled([forecastPromise,airPromise,alertsPromise]);
  if(forecastResult.status!=='fulfilled')return json({ok:false,error:'weather_provider_unavailable'},502,{'cache-control':'no-store'});
  const forecast=forecastResult.value;
  const air=airResult.status==='fulfilled'?airSnapshot(airResult.value):null;
  const alerts=alertsResult.status==='fulfilled'?alertsResult.value:[];
  return json({
    ...forecast,
    atlas:{
      ok:true,
      generatedAt:new Date().toISOString(),
      location:{lat,lon,timezone:forecast.timezone||null},
      providers:{
        forecast:{name:'Open-Meteo',status:'connected'},
        airQuality:{name:'Open-Meteo Air Quality',status:air?'connected':'unavailable'},
        severeAlerts:{name:'National Weather Service',status:alerts.length?'connected':'no_active_alerts_or_unavailable'},
        weatherKit:{name:'Apple WeatherKit',status:'not_configured'},
        weatherCompany:{name:'The Weather Company',status:'not_configured'},
        radar:{name:'ATLAS Radar',status:'not_configured'}
      },
      airQuality:air,
      alerts,
      radar:{status:'not_configured',message:'A licensed or approved radar tile source has not been configured. ATLAS does not simulate radar data.'}
    }
  });
}

async function searchLocations(url){
  const query=String(url.searchParams.get('q')||'').trim().slice(0,80);
  if(query.length<2)return json({ok:true,results:[]},200,{'cache-control':'no-store'});
  try{
    const endpoint=new URL('https://geocoding-api.open-meteo.com/v1/search');
    endpoint.searchParams.set('name',query);
    endpoint.searchParams.set('count','8');
    endpoint.searchParams.set('language','en');
    endpoint.searchParams.set('format','json');
    const data=await fetchJson(endpoint);
    const results=(Array.isArray(data?.results)?data.results:[]).map(item=>({
      id:item.id||`${item.latitude},${item.longitude}`,
      name:item.name||'',
      admin1:item.admin1||'',
      country:item.country||'',
      countryCode:item.country_code||'',
      latitude:item.latitude,
      longitude:item.longitude,
      timezone:item.timezone||''
    })).filter(item=>Number.isFinite(item.latitude)&&Number.isFinite(item.longitude));
    return json({ok:true,results},200,{'cache-control':'public, max-age=900'});
  }catch(_){
    return json({ok:false,error:'location_search_unavailable',results:[]},502,{'cache-control':'no-store'});
  }
}

function page(){return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#07142c">
<title>ATLAS Weather Intelligence</title>
<style>
:root{--ink:#fff;--muted:rgba(236,246,255,.72);--line:rgba(255,255,255,.16);--glass:rgba(10,31,58,.44);--glass2:rgba(5,20,42,.62);--accent:#6ed0ff;--danger:#ffb09d;--ok:#7de2b2}
*{box-sizing:border-box}html{background:#06162f}body{margin:0;min-height:100vh;color:var(--ink);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:linear-gradient(180deg,#4a9ce4 0%,#2c6eaf 40%,#0b2c54 100%);transition:background .9s ease}.sky{min-height:100vh;position:relative;overflow:hidden}.sky:before{content:"";position:fixed;inset:-20%;pointer-events:none;background:radial-gradient(circle at 75% 9%,rgba(255,243,190,.88) 0 2%,rgba(255,231,151,.18) 7%,transparent 18%),radial-gradient(circle at 15% 24%,rgba(255,255,255,.28),transparent 24%);filter:blur(1px);transition:opacity .8s}.sky:after{content:"";position:fixed;inset:0;pointer-events:none;background:linear-gradient(180deg,transparent 45%,rgba(1,11,29,.34) 100%)}body.wx-night{background:linear-gradient(180deg,#111c45,#08142e 55%,#030a18)}body.wx-night .sky:before{opacity:.15}body.wx-rain{background:linear-gradient(180deg,#526779,#2f455b 48%,#11263d)}body.wx-cloud{background:linear-gradient(180deg,#718aa0,#48627a 52%,#17304a)}body.wx-storm{background:linear-gradient(180deg,#252c48,#172038 50%,#070e20)}body.wx-fog{background:linear-gradient(180deg,#8b9aa6,#677989 52%,#34495c)}body.wx-snow{background:linear-gradient(180deg,#9abbd1,#6f92aa 55%,#34556e)}.wrap{position:relative;z-index:2;width:min(1240px,calc(100% - 28px));margin:auto;padding:18px 0 44px}.top{display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:10;padding:12px 0;background:linear-gradient(180deg,rgba(5,18,39,.32),transparent);backdrop-filter:blur(8px)}.brand{font-weight:800;letter-spacing:.18em;font-size:13px}.brand small{display:block;letter-spacing:.15em;font-size:8px;color:var(--muted);margin-top:3px}.spacer{flex:1}.btn,.searchInput{border:1px solid var(--line);background:rgba(8,28,52,.46);color:#fff;border-radius:999px;backdrop-filter:blur(18px)}.btn{padding:10px 14px;text-decoration:none;cursor:pointer;font-size:11px}.btn:hover{background:rgba(18,50,83,.58)}.hero{text-align:center;padding:44px 10px 24px}.place{font-size:28px;font-weight:600;letter-spacing:-.02em}.condition{font-size:17px;color:var(--muted);margin-top:6px}.temp{font-size:clamp(78px,14vw,128px);font-weight:200;line-height:.9;letter-spacing:-.08em;margin:14px 0 8px}.hilow{font-size:14px;color:#f5fbff}.syncline{display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap;margin-top:12px;font-size:10px;color:var(--muted)}.dot{width:7px;height:7px;border-radius:50%;background:var(--ok);box-shadow:0 0 12px var(--ok)}.glass{background:linear-gradient(145deg,var(--glass),var(--glass2));border:1px solid var(--line);border-radius:22px;backdrop-filter:blur(26px);box-shadow:0 22px 60px rgba(0,0,0,.16)}.searchBox{position:relative;margin:0 auto 14px;max-width:720px}.searchRow{display:flex;gap:8px}.searchInput{width:100%;padding:12px 16px;outline:none}.results{position:absolute;left:0;right:0;top:48px;z-index:20;background:rgba(4,18,38,.94);border:1px solid var(--line);border-radius:16px;overflow:hidden;display:none;box-shadow:0 22px 50px rgba(0,0,0,.3)}.results.on{display:block}.result{width:100%;border:0;border-bottom:1px solid rgba(255,255,255,.08);background:transparent;color:#fff;text-align:left;padding:12px 14px;cursor:pointer}.result:hover{background:rgba(255,255,255,.08)}.result small{display:block;color:var(--muted);margin-top:3px}.hourly{display:flex;gap:10px;overflow:auto;padding:14px;scrollbar-width:none}.hour{min-width:72px;text-align:center;padding:10px 8px;border-right:1px solid rgba(255,255,255,.10)}.hour:last-child{border-right:0}.hour b{display:block;font-size:18px;margin:8px 0}.hour .ico{font-size:23px}.hour small{color:var(--muted)}.grid{display:grid;grid-template-columns:1.25fr .75fr;gap:14px;margin-top:14px}.stack{display:grid;gap:14px}.card{padding:16px}.card h2{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:rgba(235,247,255,.68);margin:0 0 14px}.day{display:grid;grid-template-columns:90px 32px 1fr 68px;gap:10px;align-items:center;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.10);font-size:12px}.day:last-child{border-bottom:0}.range{height:4px;border-radius:99px;background:linear-gradient(90deg,#62c5ff,#ffd36d,#ff916c);opacity:.9}.details{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.detail{padding:14px;border-radius:16px;background:rgba(4,21,44,.34);border:1px solid rgba(255,255,255,.10)}.detail small{display:block;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.08em}.detail b{display:block;margin-top:7px;font-size:20px}.precipBars{display:flex;align-items:end;gap:5px;height:92px}.pbar{flex:1;min-width:6px;border-radius:5px 5px 1px 1px;background:linear-gradient(180deg,#94e4ff,#3e99e8);opacity:.9}.aqi{font-size:34px;font-weight:600}.subtle{font-size:10px;color:var(--muted);line-height:1.5}.pollen{display:grid;gap:8px;margin-top:12px}.pollenRow{display:flex;justify-content:space-between;font-size:11px;padding-bottom:7px;border-bottom:1px solid rgba(255,255,255,.09)}.alerts{display:grid;gap:9px}.alert{padding:12px;border:1px solid rgba(255,181,161,.34);background:rgba(100,31,23,.22);border-radius:14px}.alert b{display:block;font-size:12px}.alert span{display:block;font-size:10px;color:rgba(255,230,224,.75);margin-top:5px;line-height:1.5}.provider{display:grid;gap:8px}.providerRow{display:flex;justify-content:space-between;gap:10px;font-size:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.08)}.providerRow b{font-weight:600}.ok{color:var(--ok)}.warn{color:#ffd47d}.radar{min-height:145px;display:grid;place-items:center;text-align:center;padding:18px;background:radial-gradient(circle at 60% 45%,rgba(82,184,255,.16),transparent 28%),linear-gradient(135deg,rgba(2,17,35,.38),rgba(11,39,65,.45));border-radius:16px;border:1px dashed rgba(255,255,255,.18)}.favorites{display:flex;gap:7px;overflow:auto;margin-top:10px}.chip{white-space:nowrap;border:1px solid rgba(255,255,255,.16);background:rgba(6,25,48,.36);color:#fff;padding:8px 11px;border-radius:999px;cursor:pointer;font-size:10px}.footer{text-align:center;margin-top:18px;color:rgba(235,246,255,.58);font-size:9px;line-height:1.5}@media(max-width:820px){.grid{grid-template-columns:1fr}.top{flex-wrap:wrap}.brand{font-size:12px}.hero{padding-top:32px}.details{grid-template-columns:1fr 1fr}.day{grid-template-columns:72px 28px 1fr 62px}.wrap{width:min(100% - 20px,1240px)}}
</style>
</head>
<body>
<div class="sky"><div class="wrap">
<header class="top"><div class="brand">ATLAS WEATHER<small>WEATHER INTELLIGENCE</small></div><div class="spacer"></div><button class="btn" id="device">Use my location</button><button class="btn" id="pin">Save location</button><a class="btn" href="/dashboard">Dashboard</a></header>
<div class="searchBox"><div class="searchRow"><input id="search" class="searchInput" autocomplete="off" placeholder="Search city or place"><button class="btn" id="searchBtn">Search</button></div><div class="results" id="results"></div><div class="favorites" id="favorites"></div></div>
<section class="hero"><div class="place" id="place">Weather</div><div class="condition" id="condition">Connecting to live conditions...</div><div class="temp" id="temp">--°</div><div class="hilow">H:<span id="high">--°</span> &nbsp; L:<span id="low">--°</span></div><div class="syncline"><span class="dot"></span><span id="sync">ATLAS Dashboard sync active</span><span>·</span><span id="updated">Waiting for data</span></div></section>
<section class="glass hourly" id="hourly"></section>
<div class="grid">
<div class="stack">
<section class="glass card"><h2>10-day forecast</h2><div id="daily"></div></section>
<section class="glass card"><h2>Precipitation outlook</h2><div class="precipBars" id="precipBars"></div><div class="subtle" id="precipText">15-minute precipitation feed loading.</div></section>
<section class="glass card"><h2>Severe weather alerts</h2><div class="alerts" id="alerts"><div class="subtle">Checking official alerts.</div></div></section>
</div>
<div class="stack">
<section class="glass card"><h2>Conditions</h2><div class="details"><div class="detail"><small>Feels like</small><b id="feels">--°</b></div><div class="detail"><small>Humidity</small><b id="humidity">--</b></div><div class="detail"><small>Wind</small><b id="wind">--</b></div><div class="detail"><small>Gusts</small><b id="gust">--</b></div><div class="detail"><small>Cloud cover</small><b id="cloud">--</b></div><div class="detail"><small>Pressure</small><b id="pressure">--</b></div><div class="detail"><small>UV index</small><b id="uv">--</b></div><div class="detail"><small>Visibility</small><b id="visibility">--</b></div></div></section>
<section class="glass card"><h2>Air quality & pollen</h2><div class="aqi" id="aqi">--</div><div class="subtle" id="aqiLabel">AQI feed loading.</div><div class="pollen" id="pollen"></div></section>
<section class="glass card"><h2>Radar</h2><div class="radar" id="radar"><div><b>Radar source not configured</b><div class="subtle" style="margin-top:8px">ATLAS will not display simulated radar. Connect an approved radar tile provider to activate this layer.</div></div></div></section>
<section class="glass card"><h2>Provider status</h2><div class="provider" id="providers"></div><div class="subtle" style="margin-top:10px">The interface is a clean-room ATLAS implementation inspired by modern weather apps. Apple and The Weather Company services are only marked connected when authorized credentials are actually configured.</div></section>
</div>
</div>
<div class="footer">Forecast, air-quality and official-alert availability vary by location. ATLAS preserves provider attribution and never invents live conditions.</div>
</div></div>
<script>
const $=s=>document.querySelector(s);
const codes={0:['Clear','☀️','clear'],1:['Mostly clear','🌤️','clear'],2:['Partly cloudy','⛅','cloud'],3:['Cloudy','☁️','cloud'],45:['Fog','🌫️','fog'],48:['Rime fog','🌫️','fog'],51:['Drizzle','🌦️','rain'],53:['Drizzle','🌦️','rain'],55:['Heavy drizzle','🌧️','rain'],56:['Freezing drizzle','🌧️','rain'],57:['Freezing drizzle','🌧️','rain'],61:['Light rain','🌦️','rain'],63:['Rain','🌧️','rain'],65:['Heavy rain','🌧️','rain'],66:['Freezing rain','🌧️','rain'],67:['Freezing rain','🌧️','rain'],71:['Light snow','🌨️','snow'],73:['Snow','🌨️','snow'],75:['Heavy snow','❄️','snow'],77:['Snow grains','❄️','snow'],80:['Showers','🌦️','rain'],81:['Showers','🌧️','rain'],82:['Heavy showers','⛈️','storm'],85:['Snow showers','🌨️','snow'],86:['Heavy snow showers','🌨️','snow'],95:['Thunderstorm','⛈️','storm'],96:['Storm with hail','⛈️','storm'],99:['Severe storm','⛈️','storm']};
let current={lat:28.5383,lon:-81.3792,label:'Orlando, FL'};
function safeNumber(v,digits=0){return Number.isFinite(Number(v))?Number(v).toFixed(digits):'--'}
function weatherCode(code){return codes[code]||['Weather','🌤️','cloud']}
function dir(deg){const names=['N','NE','E','SE','S','SW','W','NW'];return names[Math.round((Number(deg)||0)/45)%8]}
function timeLabel(value){if(!value)return '--';const d=new Date(value);return d.toLocaleTimeString([], {hour:'numeric'}).replace(' ','')}
function dayLabel(value,index){if(index===0)return 'Today';return new Date(value+'T12:00:00').toLocaleDateString([], {weekday:'short'})}
function aqiLabel(v){const n=Number(v);if(!Number.isFinite(n))return 'Air quality unavailable';if(n<=50)return 'Good';if(n<=100)return 'Moderate';if(n<=150)return 'Unhealthy for sensitive groups';if(n<=200)return 'Unhealthy';if(n<=300)return 'Very unhealthy';return 'Hazardous'}
function setTheme(w){const info=weatherCode(w.weather_code);document.body.className='wx-'+(w.is_day===0?'night':info[2]);$('#condition').textContent=info[0]}
function setText(id,value){const el=$(id);if(el)el.textContent=value}
function renderHourly(data){const h=data.hourly||{},wrap=$('#hourly');wrap.innerHTML='';const count=Math.min(24,(h.time||[]).length);for(let i=0;i<count;i++){const info=weatherCode(h.weather_code?.[i]);const item=document.createElement('div');item.className='hour';const label=i===0?'Now':timeLabel(h.time[i]);const pop=h.precipitation_probability?.[i];item.innerHTML='<small>'+label+'</small><div class="ico">'+info[1]+'</div><b>'+Math.round(h.temperature_2m?.[i]??0)+'°</b><small>'+(pop==null?'':Math.round(pop)+'%')+'</small>';wrap.appendChild(item)}}
function renderDaily(data){const d=data.daily||{},wrap=$('#daily');wrap.innerHTML='';const count=Math.min(10,(d.time||[]).length);for(let i=0;i<count;i++){const info=weatherCode(d.weather_code?.[i]);const row=document.createElement('div');row.className='day';const lo=d.temperature_2m_min?.[i],hi=d.temperature_2m_max?.[i];row.innerHTML='<b>'+dayLabel(d.time[i],i)+'</b><span>'+info[1]+'</span><div class="range"></div><span>'+Math.round(lo??0)+'° / '+Math.round(hi??0)+'°</span>';wrap.appendChild(row)}}
function renderPrecip(data){const m=data.minutely_15||{},vals=Array.isArray(m.precipitation)?m.precipitation.slice(0,24):[];const wrap=$('#precipBars');wrap.innerHTML='';if(!vals.length){setText('#precipText','15-minute precipitation feed is unavailable for this location.');return}const max=Math.max(.01,...vals.map(v=>Number(v)||0));vals.forEach(v=>{const bar=document.createElement('div');bar.className='pbar';bar.style.height=Math.max(3,Math.min(100,((Number(v)||0)/max)*100))+'%';bar.title=safeNumber(v,2)+' in';wrap.appendChild(bar)});const total=vals.reduce((a,b)=>a+(Number(b)||0),0);setText('#precipText','Next 6 hours: '+safeNumber(total,2)+' in projected precipitation across 15-minute intervals.')}
function renderAir(atlas){const air=atlas?.airQuality;if(!air){setText('#aqi','--');setText('#aqiLabel','Air-quality feed unavailable.');$('#pollen').innerHTML='';return}setText('#aqi',air.aqi==null?'--':Math.round(air.aqi));setText('#aqiLabel','US AQI: '+aqiLabel(air.aqi)+' · PM2.5 '+safeNumber(air.pm25,1)+' µg/m³');const wrap=$('#pollen');wrap.innerHTML='';Object.entries(air.pollen||{}).forEach(([name,value])=>{const row=document.createElement('div');row.className='pollenRow';const left=document.createElement('span');left.textContent=name.charAt(0).toUpperCase()+name.slice(1);const right=document.createElement('b');right.textContent=value==null?'--':safeNumber(value,1)+' gr/m³';row.append(left,right);wrap.appendChild(row)})}
function renderAlerts(alerts){const wrap=$('#alerts');wrap.innerHTML='';if(!Array.isArray(alerts)||!alerts.length){const empty=document.createElement('div');empty.className='subtle';empty.textContent='No active official alerts returned for this location.';wrap.appendChild(empty);return}alerts.forEach(item=>{const card=document.createElement('div');card.className='alert';const title=document.createElement('b');title.textContent=item.headline||item.event||'Weather alert';const detail=document.createElement('span');detail.textContent=(item.severity||'Unknown')+' · '+(item.source||'Official source');card.append(title,detail);wrap.appendChild(card)})}
function renderProviders(providers){const wrap=$('#providers');wrap.innerHTML='';Object.values(providers||{}).forEach(item=>{const row=document.createElement('div');row.className='providerRow';const name=document.createElement('span');name.textContent=item.name||'Provider';const status=document.createElement('b');status.textContent=String(item.status||'unknown').replaceAll('_',' ');status.className=item.status==='connected'?'ok':'warn';row.append(name,status);wrap.appendChild(row)})}
function render(data){const w=data.current||{},d=data.daily||{},h=data.hourly||{},atlas=data.atlas||{};setTheme(w);setText('#place',current.label);setText('#temp',Math.round(w.temperature_2m??0)+'°');setText('#feels',Math.round(w.apparent_temperature??0)+'°');setText('#humidity',Math.round(w.relative_humidity_2m??0)+'%');setText('#wind',dir(w.wind_direction_10m)+' '+Math.round(w.wind_speed_10m??0)+' mph');setText('#gust',Math.round(w.wind_gusts_10m??0)+' mph');setText('#cloud',Math.round(w.cloud_cover??0)+'%');setText('#pressure',safeNumber(w.surface_pressure,0)+' hPa');setText('#high',d.temperature_2m_max?.[0]==null?'--°':Math.round(d.temperature_2m_max[0])+'°');setText('#low',d.temperature_2m_min?.[0]==null?'--°':Math.round(d.temperature_2m_min[0])+'°');setText('#uv',h.uv_index?.[0]==null?'--':safeNumber(h.uv_index[0],1));setText('#visibility',h.visibility?.[0]==null?'--':safeNumber(Number(h.visibility[0])/1609.344,1)+' mi');setText('#updated','Updated '+new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}));renderHourly(data);renderDaily(data);renderPrecip(data);renderAir(atlas);renderAlerts(atlas.alerts);renderProviders(atlas.providers);const radar=atlas.radar||{};if(radar.status==='connected')$('#radar').textContent='Radar connected';renderFavorites()}
async function load(){setText('#updated','Updating...');try{const r=await fetch('/api/weather?lat='+encodeURIComponent(current.lat)+'&lon='+encodeURIComponent(current.lon),{cache:'no-store'});if(!r.ok)throw new Error('weather');render(await r.json())}catch(_){setText('#updated','Weather feed unavailable');setText('#condition','Unable to load live weather')}}
function persistLocation(location,followDevice){current=location;localStorage.setItem('atlas.weather.location',JSON.stringify(location));localStorage.setItem('atlas.weather.followDevice',followDevice?'true':'false');setText('#sync',followDevice?'Dashboard follows device location':'Dashboard pinned to '+location.label);load()}
function locate(){if(!navigator.geolocation){load();return}setText('#updated','Requesting location...');navigator.geolocation.getCurrentPosition(pos=>persistLocation({lat:pos.coords.latitude,lon:pos.coords.longitude,label:'Current location'},true),()=>{setText('#sync','Location permission not granted · using saved/default location');load()},{timeout:7000,maximumAge:600000})}
async function search(){const q=$('#search').value.trim();if(q.length<2)return;const box=$('#results');box.className='results on';box.innerHTML='<button class="result" disabled>Searching...</button>';try{const r=await fetch('/api/weather/search?q='+encodeURIComponent(q),{cache:'no-store'});const d=await r.json();box.innerHTML='';(d.results||[]).forEach(item=>{const btn=document.createElement('button');btn.className='result';const title=document.createElement('b');title.textContent=item.name;const sub=document.createElement('small');sub.textContent=[item.admin1,item.country].filter(Boolean).join(', ');btn.append(title,sub);btn.onclick=()=>{box.className='results';$('#search').value='';persistLocation({lat:item.latitude,lon:item.longitude,label:[item.name,item.admin1||item.country].filter(Boolean).join(', ')},false)};box.appendChild(btn)});if(!(d.results||[]).length)box.innerHTML='<button class="result" disabled>No locations found</button>'}catch(_){box.innerHTML='<button class="result" disabled>Search unavailable</button>'}}
function favorites(){try{return JSON.parse(localStorage.getItem('atlas.weather.favorites')||'[]')}catch(_){return []}}
function saveFavorite(){const list=favorites();if(!list.some(x=>Math.abs(x.lat-current.lat)<.001&&Math.abs(x.lon-current.lon)<.001))list.unshift(current);localStorage.setItem('atlas.weather.favorites',JSON.stringify(list.slice(0,8)));renderFavorites()}
function renderFavorites(){const wrap=$('#favorites');wrap.innerHTML='';favorites().forEach(item=>{const chip=document.createElement('button');chip.className='chip';chip.textContent=item.label;chip.onclick=()=>persistLocation(item,false);wrap.appendChild(chip)})}
$('#device').onclick=locate;$('#pin').onclick=saveFavorite;$('#searchBtn').onclick=search;$('#search').addEventListener('keydown',event=>{if(event.key==='Enter')search()});document.addEventListener('click',event=>{if(!event.target.closest('.searchBox'))$('#results').className='results'});
(function start(){renderFavorites();let saved=null;try{saved=JSON.parse(localStorage.getItem('atlas.weather.location')||'null')}catch(_){}const follow=localStorage.getItem('atlas.weather.followDevice')!=='false';if(saved&&Number.isFinite(Number(saved.lat))&&Number.isFinite(Number(saved.lon))){current={lat:Number(saved.lat),lon:Number(saved.lon),label:String(saved.label||'Saved location')}}if(follow)locate();else{setText('#sync','Dashboard pinned to '+current.label);load()}setInterval(load,300000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()})})();
</script>
</body></html>`}

function htmlResponse(body,method){
  const headers={
    'content-type':'text/html; charset=utf-8',
    'cache-control':'no-store',
    'x-content-type-options':'nosniff',
    'referrer-policy':'strict-origin-when-cross-origin',
    'content-security-policy':"default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
  };
  return new Response(method==='HEAD'?null:body,{headers});
}

export async function handleWeather(request){
  const url=new URL(request.url);
  if(request.method==='OPTIONS'&&url.pathname.startsWith('/api/weather'))return new Response(null,{headers:JSON_HEADERS});
  if(!['GET','HEAD','OPTIONS'].includes(request.method))return json({ok:false,error:'method_not_allowed'},405,{'allow':'GET, HEAD, OPTIONS','cache-control':'no-store'});
  if(url.pathname==='/weather')return htmlResponse(page(),request.method);
  if(url.pathname==='/api/weather/search')return searchLocations(url);
  if(url.pathname==='/api/weather')return aggregateWeather(url);
  if(url.pathname==='/api/weather/capabilities')return json({ok:true,features:{current:true,hourly:true,daily10:true,precipitation15Minute:true,airQuality:true,pollen:true,severeAlerts:true,locationSearch:true,savedLocations:'browser',dashboardSync:true,radar:false},providers:{forecast:'Open-Meteo',airQuality:'Open-Meteo Air Quality',alerts:'National Weather Service',weatherKit:'not_configured',weatherCompany:'not_configured',radar:'not_configured'}},200,{'cache-control':'public, max-age=300'});
  return null;
}
