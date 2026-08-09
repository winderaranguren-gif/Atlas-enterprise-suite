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

  const loadCarsEntry=()=>{
    const carsEntry=document.createElement('script');
    carsEntry.src='atlas-cars-entry.js?v=1';
    carsEntry.async=false;
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

  const loadRunbooks=()=>{
    const runbooks=document.createElement('script');
    runbooks.src='atlas-support-runbooks.js?v=1';
    runbooks.async=false;
    runbooks.onload=loadDragDrop;
    runbooks.onerror=loadDragDrop;
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