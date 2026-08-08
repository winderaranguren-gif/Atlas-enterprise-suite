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

  const loadRunbooks=()=>{
    const runbooks=document.createElement('script');
    runbooks.src='atlas-support-runbooks.js?v=1';
    runbooks.async=false;
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