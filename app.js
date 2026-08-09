(()=>{
  const css=document.createElement('link');
  css.rel='stylesheet';
  css.href='atlas-suite.css?v=4';
  document.head.append(css);

  const operationalCss=document.createElement('link');
  operationalCss.rel='stylesheet';
  operationalCss.href='atlas-os-modules.css?v=1';
  document.head.append(operationalCss);

  const supportCss=document.createElement('link');
  supportCss.rel='stylesheet';
  supportCss.href='atlas-technical-support.css?v=1';
  document.head.append(supportCss);

  const dragDropCss=document.createElement('link');
  dragDropCss.rel='stylesheet';
  dragDropCss.href='atlas-dragdrop.css?v=1';
  document.head.append(dragDropCss);

  if(!document.querySelector('link[href*="atlas-accessibility.css"]')){
    const accessibilityCss=document.createElement('link');
    accessibilityCss.rel='stylesheet';
    accessibilityCss.href='atlas-accessibility.css?v=4';
    accessibilityCss.dataset.atlasWu='0300';
    document.head.append(accessibilityCss);
  }

  navigator.serviceWorker?.addEventListener('message',(event)=>{
    const detail=event.data;
    if(detail?.type!=='atlas:alert')return;
    if(window.ATLASAccessibility?.visualAlert)window.ATLASAccessibility.visualAlert(detail);
    else window.dispatchEvent(new CustomEvent('atlas:alert',{detail}));
  });

  const loadGpsEntry=()=>{
    const gpsEntry=document.createElement('script');
    gpsEntry.src='atlas-gps-entry.js?v=1';
    gpsEntry.async=false;
    document.body.append(gpsEntry);
  };

  const loadCarsEntry=()=>{
    const carsEntry=document.createElement('script');
    carsEntry.src='atlas-cars-entry.js?v=1';
    carsEntry.async=false;
    carsEntry.onload=loadGpsEntry;
    carsEntry.onerror=loadGpsEntry;
    document.body.append(carsEntry);
  };

  const loadDragDrop=()=>{
    const dragDrop=document.createElement('script');
    dragDrop.src='atlas-dragdrop.js?v=1';
    dragDrop.async=false;
    dragDrop.onload=loadCarsEntry;
    dragDrop.onerror=loadCarsEntry;
    document.body.append(dragDrop);
  };

  const accessibilityScripts=()=>[...document.querySelectorAll('script[src*="atlas-accessibility.js"]')];
  const isV4Accessibility=(script)=>{
    try{return new URL(script.src,location.href).searchParams.get('v')==='4';}catch(_){return false;}
  };
  const hasInstalledV4=()=>Boolean(
    window.__ATLAS_WU_0300_ACCESS_INSTALLED__&&
    window.ATLASAccessibility?.workUnit==='ATLAS-WU-0300'&&
    /^1\.3\./.test(String(window.ATLASAccessibility?.version||''))
  );

  let accessibilityAdvanced=false;
  const advanceAfterAccessibility=()=>{
    if(accessibilityAdvanced)return;
    accessibilityAdvanced=true;
    loadDragDrop();
  };

  const teardownAccessibilityRuntime=()=>{
    try{window.ATLASAccessibility?.stopCamera?.({silent:true});}catch(_){}
    try{window.ATLASAccessibility?.stopCaptions?.({silent:true});}catch(_){}
    try{window.ATLASAccessibility?.close?.({restoreFocus:false});}catch(_){}
    document.getElementById('atlas-a11y-root')?.remove();
    try{delete window.ATLASAccessibility;}catch(_){window.ATLASAccessibility=undefined;}
    try{delete window.__ATLAS_WU_0300_ACCESS_INSTALLED__;}catch(_){window.__ATLAS_WU_0300_ACCESS_INSTALLED__=false;}
  };

  const appendAccessibilityV4=({replaceRuntime=false,onSettled=advanceAfterAccessibility}={})=>{
    if(replaceRuntime)teardownAccessibilityRuntime();
    const accessibility=document.createElement('script');
    accessibility.src='atlas-accessibility.js?v=4';
    accessibility.dataset.atlasWu='0300';
    accessibility.async=false;
    accessibility.onload=onSettled;
    accessibility.onerror=onSettled;
    document.body.append(accessibility);
  };

  const RECONCILE_TIMEOUT_MS=1500;
  let reconciliationActive=false;
  const reconcileLegacyAccessibility=(legacyScripts)=>{
    if(reconciliationActive)return;
    reconciliationActive=true;
    const pending=new Set(legacyScripts);
    let finalized=false;
    let timer=null;

    const finalize=()=>{
      if(finalized)return;
      finalized=true;
      if(timer)clearTimeout(timer);
      // Remove any shell/API installed by cached v3 before v4 gets a chance to bind.
      appendAccessibilityV4({replaceRuntime:true,onSettled:advanceAfterAccessibility});
    };

    const settleKnownLegacy=(script,loaded)=>{
      if(finalized){
        // A script that was genuinely stalled past the bounded wait must never be
        // allowed to become the final runtime. If it eventually executes, replace
        // its shell/API immediately with a fresh v4 instance.
        if(loaded)appendAccessibilityV4({replaceRuntime:true,onSettled:()=>{}});
        return;
      }
      pending.delete(script);
      if(!pending.size)finalize();
    };

    for(const script of pending){
      script.addEventListener('load',()=>settleKnownLegacy(script,true),{once:true});
      script.addEventListener('error',()=>settleKnownLegacy(script,false),{once:true});
    }

    // Never wait on the global window load event. A broken image/iframe/stylesheet
    // must not deadlock Accessibility or the downstream DragDrop/Cars/GPS chain.
    timer=setTimeout(finalize,RECONCILE_TIMEOUT_MS);
  };

  const waitForExistingV4=(script)=>{
    let settled=false;
    const finish=()=>{
      if(settled)return;
      settled=true;
      clearTimeout(timer);
      if(hasInstalledV4())return advanceAfterAccessibility();
      appendAccessibilityV4();
    };
    script.addEventListener('load',finish,{once:true});
    script.addEventListener('error',finish,{once:true});
    const timer=setTimeout(finish,RECONCILE_TIMEOUT_MS);
  };

  const loadAccessibility=()=>{
    const scripts=accessibilityScripts();
    const legacy=scripts.filter((script)=>!isV4Accessibility(script));

    if(legacy.length)return reconcileLegacyAccessibility(legacy);
    if(hasInstalledV4())return advanceAfterAccessibility();

    const existingV4=scripts.find(isV4Accessibility);
    if(existingV4)return waitForExistingV4(existingV4);

    appendAccessibilityV4();
  };

  const loadRunbooks=()=>{
    const runbooks=document.createElement('script');
    runbooks.src='atlas-support-runbooks.js?v=1';
    runbooks.async=false;
    runbooks.onload=loadAccessibility;
    runbooks.onerror=loadAccessibility;
    document.body.append(runbooks);
  };

  const loadSupport=()=>{
    const support=document.createElement('script');
    support.src='atlas-technical-support.js?v=1';
    support.async=false;
    support.onload=loadRunbooks;
    support.onerror=loadRunbooks;
    document.body.append(support);
  };

  const loadResilience=()=>{
    const resilience=document.createElement('script');
    resilience.src='atlas-resilience.js?v=1';
    resilience.async=false;
    resilience.onload=loadSupport;
    resilience.onerror=loadSupport;
    document.body.append(resilience);
  };

  const loadOperational=()=>{
    const operational=document.createElement('script');
    operational.src='atlas-os-operational.js?v=1';
    operational.async=false;
    operational.onload=loadResilience;
    operational.onerror=loadResilience;
    document.body.append(operational);
  };

  const loadSuite=()=>{
    const script=document.createElement('script');
    script.src='atlas-suite.js?v=4';
    script.async=false;
    script.onload=loadOperational;
    script.onerror=loadOperational;
    document.body.append(script);
  };

  const migration=document.createElement('script');
  migration.src='atlas-legacy-migrate.js?v=4';
  migration.async=false;
  migration.onload=loadSuite;
  migration.onerror=loadSuite;
  document.body.append(migration);
})();