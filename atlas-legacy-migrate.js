(()=>{
  const target='atlas-suite-functional-v4';
  if(localStorage.getItem(target)) return;
  const sourceKeys=['atlas-enterprise-v3','atlas-enterprise-v2','atlas-enterprise-v1'];
  let legacy=null;
  for(const key of sourceKeys){
    try{
      const raw=localStorage.getItem(key);
      if(raw){legacy=JSON.parse(raw);break;}
    }catch{}
  }
  if(!legacy?.data||!Array.isArray(legacy.companies)) return;
  const collections=['customers','invoices','expenses','journals','products','employees','wallet','documents','rewards','ride','marketplace','shipments','vehicles','health','safety','community'];
  const moduleNames=['crm','invoices','expenses','accounting','inventory','employees','wallet','documents','rewards','ride','marketplace','freight','cars','health','safety','community'];
  for(const company of legacy.companies){
    const workspace=legacy.data[company.id]||{};
    for(const name of collections) if(!Array.isArray(workspace[name])) workspace[name]=[];
    if(Array.isArray(workspace.products)&&!workspace.inventory) workspace.inventory=workspace.products;
    workspace.audit=Array.isArray(workspace.audit)?workspace.audit:[];
    workspace.modules={...(workspace.modules||{})};
    for(const name of moduleNames) workspace.modules[name]=true;
    legacy.data[company.id]=workspace;
  }
  legacy.page='dashboard';
  localStorage.setItem(target,JSON.stringify(legacy));
})();
