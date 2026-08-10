(()=>{
  const RELEASE_URL='/atlas.release.json';
  const POLL_MS=60_000;
  const storageKey='atlas.release.id';
  let applying=false;

  async function fetchRelease(){
    const res=await fetch(`${RELEASE_URL}?t=${Date.now()}`,{cache:'no-store',headers:{'cache-control':'no-cache'}});
    if(!res.ok) throw new Error(`release_manifest_${res.status}`);
    return res.json();
  }

  function canAutoApply(release){
    return release?.autoApply===true&&release?.productionReady===true&&release?.verifiedE2E===true;
  }

  async function applyWebUpdate(release){
    if(!canAutoApply(release)) throw new Error('release_not_promoted_for_auto_apply');
    if(applying) return;
    applying=true;
    try{
      const registration=await navigator.serviceWorker?.getRegistration?.();
      if(registration){
        await registration.update();
        if(registration.waiting) registration.waiting.postMessage('SKIP_WAITING');
      }
      sessionStorage.setItem(storageKey,release.releaseId);
      window.dispatchEvent(new CustomEvent('atlas:update-ready',{detail:release}));
      setTimeout(()=>location.reload(),250);
    }finally{setTimeout(()=>{applying=false},5000)}
  }

  async function check(){
    try{
      const release=await fetchRelease();
      const current=sessionStorage.getItem(storageKey);
      if(!current){sessionStorage.setItem(storageKey,release.releaseId);return release;}
      if(current!==release.releaseId){
        window.dispatchEvent(new CustomEvent('atlas:update-detected',{detail:release}));
        if(canAutoApply(release)) await applyWebUpdate(release);
        else window.dispatchEvent(new CustomEvent('atlas:update-blocked',{detail:{release,reason:'production_or_e2e_gate_not_met'}}));
      }
      return release;
    }catch(error){
      window.dispatchEvent(new CustomEvent('atlas:update-check-failed',{detail:{message:error.message}}));
      return null;
    }
  }

  window.ATLASUpdateCore={check,fetchRelease,applyWebUpdate,canAutoApply};
  addEventListener('load',()=>{check();setInterval(check,POLL_MS)});
  addEventListener('online',check);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check()});
})();
