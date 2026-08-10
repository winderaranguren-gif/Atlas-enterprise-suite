(()=>{
  const ROOT=document.documentElement;
  const WEATHER=['clear','cloudy','rain','storm','fog','snow'];
  const PHASE=['dawn','day','golden','dusk','night'];
  function phase(date=new Date()){
    const h=date.getHours()+date.getMinutes()/60;
    if(h>=5&&h<7)return'dawn';
    if(h>=7&&h<16.5)return'day';
    if(h>=16.5&&h<18)return'golden';
    if(h>=18&&h<20)return'dusk';
    return'night';
  }
  function normalizeWeather(raw){
    const v=String(raw||'').toLowerCase();
    if(/thunder|storm|lightning/.test(v))return'storm';
    if(/rain|drizzle|shower/.test(v))return'rain';
    if(/snow|sleet|ice/.test(v))return'snow';
    if(/fog|mist|haze|smoke/.test(v))return'fog';
    if(/cloud|overcast/.test(v))return'cloudy';
    return'clear';
  }
  function apply(next={}){
    const p=PHASE.includes(next.phase)?next.phase:phase();
    const w=WEATHER.includes(next.weather)?next.weather:'clear';
    ROOT.dataset.atlasPhase=p;
    ROOT.dataset.atlasWeather=w;
    ROOT.dataset.atlasEnvironmentSource=next.source||'time-fallback';
    const detail={phase:p,weather:w,source:ROOT.dataset.atlasEnvironmentSource,temperature:next.temperature??null,location:next.location||null};
    window.ATLAS_ENVIRONMENT=detail;
    window.dispatchEvent(new CustomEvent('atlas:environment',{detail}));
    return detail;
  }
  async function refresh(){
    const override=localStorage.getItem('atlas.environment.override');
    if(override){
      try{const o=JSON.parse(override);return apply({...o,source:'local-override'});}catch{}
    }
    try{
      const r=await fetch('/api/environment',{cache:'no-store',headers:{Accept:'application/json'}});
      if(r.ok){const data=await r.json();return apply({weather:normalizeWeather(data.condition||data.weather||data.summary),phase:data.phase||phase(),temperature:data.temperature??data.temp,location:data.location||data.city,source:'same-origin-weather'});}
    }catch{}
    return apply({weather:'clear',phase:phase(),source:'time-fallback'});
  }
  function setPreview(weather,dayPhase){
    if(!WEATHER.includes(weather)||!PHASE.includes(dayPhase))throw new Error('Unsupported ATLAS environment preview');
    localStorage.setItem('atlas.environment.override',JSON.stringify({weather,phase:dayPhase}));
    return apply({weather,phase:dayPhase,source:'local-override'});
  }
  function clearPreview(){localStorage.removeItem('atlas.environment.override');return refresh();}
  window.ATLASEnvironment={refresh,setPreview,clearPreview,phase,normalizeWeather};
  refresh();
  setInterval(refresh,5*60*1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();
