(()=>{
  const RELEASE_URL='/atlas.release.json';
  const FINGERPRINT_URL='/api/system/release-fingerprint';
  const READINESS_URL='/api/system/readiness';
  const POLL_MS=60_000;
  const storageKey='atlas.release.id';
  let applying=false;

  async function fetchJson(url){
    const res=await fetch(`${url}?t=${Date.now()}`,{cache:'no-store',headers:{'cache-control':'no-cache'}});
    if(!res.ok) throw new Error(`${url}_${res.status}`);
    return res.json();
  }

  const fetchRelease=()=>fetchJson(RELEASE_URL);
  const fetchFingerprint=()=>fetchJson(FINGERPRINT_URL);
  const fetchReadiness=()=>fetchJson(READINESS_URL);

  async function releaseIsEligible(release){
    if(release?.autoApply!==true||release?.productionReady!==true||release?.verifiedE2E!==true) return false;
    const expected=String(release.expectedSourceSha||'').trim();
    if(!/^[0-9a-f]{40}$/i.test(expected)) return false;
    const [fingerprint,readiness]=await Promise.all([fetchFingerprint(),fetchReadiness()]);
    return readiness?.operational===true&&fingerprint?.shaConfigured===true&&fingerprint?.deployedSha===expected&&readiness?.deployedSha===expected;
  }

  async function applyWebUpdate(release){
    if(applying) return;
    if(!(await releaseIsEligible(release))) throw new Error('release_not_eligible_for_auto_apply');
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
        if(await releaseIsEligible(release)) await applyWebUpdate(release);
      }
      return release;
    }catch(error){
      window.dispatchEvent(new CustomEvent('atlas:update-check-failed',{detail:{message:error.message}}));
      return null;
    }
  }

  window.ATLASUpdateCore={check,fetchRelease,fetchFingerprint,fetchReadiness,releaseIsEligible,applyWebUpdate};
  addEventListener('load',()=>{check();setInterval(check,POLL_MS)});
  addEventListener('online',check);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check()});
})();
