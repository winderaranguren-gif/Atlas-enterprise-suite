(()=>{
  const css=document.createElement('link');
  css.rel='stylesheet';
  css.href='atlas-suite.css?v=4';
  document.head.append(css);
  const script=document.createElement('script');
  script.src='atlas-suite.js?v=4';
  script.async=false;
  document.body.append(script);
})();
