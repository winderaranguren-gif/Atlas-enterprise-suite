(()=>{
  const root=document.documentElement;
  const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  const coarse=matchMedia('(pointer: coarse)').matches;
  const mobile=matchMedia('(max-width: 720px)').matches;
  root.dataset.atlasSurface=standalone?'app':'web';
  root.dataset.atlasDevice=mobile?'mobile':coarse?'tablet':'desktop';
  function sync(){
    root.dataset.atlasDevice=matchMedia('(max-width: 720px)').matches?'mobile':matchMedia('(pointer: coarse)').matches?'tablet':'desktop';
  }
  addEventListener('resize',sync,{passive:true});
  addEventListener('orientationchange',sync,{passive:true});
  window.ATLASSurface={mode:()=>root.dataset.atlasSurface,device:()=>root.dataset.atlasDevice};
})();
