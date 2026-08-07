(()=>{
  const css=document.createElement('link');
  css.rel='stylesheet';
  css.href='atlas-suite.css?v=4';
  document.head.append(css);

  const loadSuite=()=>{
    const script=document.createElement('script');
    script.src='atlas-suite.js?v=4';
    script.async=false;
    document.body.append(script);
  };

  const migration=document.createElement('script');
  migration.src='atlas-legacy-migrate.js?v=4';
  migration.async=false;
  migration.onload=loadSuite;
  migration.onerror=loadSuite;
  document.body.append(migration);
})();
