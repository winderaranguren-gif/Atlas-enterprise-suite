(()=>{
  async function mount(kind){
    const root=document.querySelector('#mainView');
    if(!root||!window.ATLASOperationalUI)return;
    root.className='workspace';
    const render=async()=>{
      if(kind==='pages') root.innerHTML=`<div class="simple-view">${await window.ATLASOperationalUI.pagesView()}</div>`;
      else if(kind==='backups') root.innerHTML=`<div class="simple-view">${await window.ATLASOperationalUI.backupsView()}</div>`;
      else root.innerHTML=`<div class="simple-view">${await window.ATLASOperationalUI.statusView()}</div>`;
      await window.ATLASOperationalUI.bind(root,render);
      root.focus({preventScroll:true});
    };
    await render();
  }
  function wire(){
    document.querySelectorAll('.nav[data-operational]').forEach(btn=>{
      btn.addEventListener('click',async event=>{
        event.preventDefault();event.stopImmediatePropagation();
        document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x===btn));
        await mount(btn.dataset.operational);
      },true);
    });
    document.addEventListener('click',event=>{
      const backup=event.target.closest('.quick-action[data-real-backup]');
      if(backup){event.preventDefault();event.stopImmediatePropagation();mount('backups')}
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);else wire();
  window.ATLASOperationalRouting={mount,wire};
})();
