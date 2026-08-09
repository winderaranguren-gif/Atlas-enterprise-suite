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
  const resourceFinished=(script)=>{
    try{return performance.getEntriesByName(script.src).length>0;}catch(_){return false;}
  };

  const appendAccessibilityV4=()=>{
    const accessibility=document.createElement('script');
    accessibility.src='atlas-accessibility.js?v=4';
    accessibility.dataset.atlasWu='0300';
    accessibility.async=false;
    accessibility.onload=loadDragDrop;
    accessibility.onerror=loadDragDrop;
    document.body.append(accessibility);
  };

  const loadAccessibility=()=>{
    if(window.__ATLAS_WU_0300_ACCESS_INSTALLED__)return loadDragDrop();

    const scripts=accessibilityScripts();
    const existingV4=scripts.find(isV4Accessibility);
    if(existingV4){
      if(resourceFinished(existingV4))return appendAccessibilityV4();
      existingV4.addEventListener('load',loadDragDrop,{once:true});
      existingV4.addEventListener('error',appendAccessibilityV4,{once:true});
      return;
    }

    const pendingLegacy=scripts.filter((script)=>!isV4Accessibility(script)&&!resourceFinished(script));
    if(pendingLegacy.length){
      let remaining=pendingLegacy.length;
      const settled=()=>{
        remaining-=1;
        if(remaining===0)appendAccessibilityV4();
      };
      pendingLegacy.forEach((script)=>{
        script.addEventListener('load',settled,{once:true});
        script.addEventListener('error',settled,{once:true});
      });
      return;
    }

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

  const loadOperational=()=>{
    const operational=document.createElement('script');
    operational.src='atlas-os-operational.js?v=1';
    operational.async=false;
    operational.onload=loadSupport;
    operational.onerror=loadSupport;
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