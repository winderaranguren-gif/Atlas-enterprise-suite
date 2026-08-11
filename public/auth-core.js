(()=>{
  const TOKEN_KEY='atlas.auth.token';
  const USER_KEY='atlas.auth.user';
  const MEMBERSHIPS_KEY='atlas.auth.memberships';
  const SCOPE_KEY='atlas.auth.scope';

  const parse=(value,fallback)=>{try{return JSON.parse(value)}catch{return fallback}};
  const getToken=()=>localStorage.getItem(TOKEN_KEY)||'';
  const getUser=()=>parse(localStorage.getItem(USER_KEY),null);
  const getMemberships=()=>parse(localStorage.getItem(MEMBERSHIPS_KEY),[]);
  const getScope=()=>parse(localStorage.getItem(SCOPE_KEY),null);
  const membershipKey=m=>`${m.organization_id}::${m.dba_id}`;

  function clear(){
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(MEMBERSHIPS_KEY);
    localStorage.removeItem(SCOPE_KEY);
  }

  function setSession(data){
    if(!data?.session_token||!data?.user||!Array.isArray(data.memberships)||!data.memberships.length) throw new Error('Invalid authentication response');
    localStorage.setItem(TOKEN_KEY,data.session_token);
    localStorage.setItem(USER_KEY,JSON.stringify(data.user));
    localStorage.setItem(MEMBERSHIPS_KEY,JSON.stringify(data.memberships));
    let scope=getScope();
    if(!scope||!data.memberships.some(m=>membershipKey(m)===membershipKey(scope))) scope=data.memberships[0];
    localStorage.setItem(SCOPE_KEY,JSON.stringify(scope));
    return scope;
  }

  function setScope(scope){
    const memberships=getMemberships();
    if(!scope||!memberships.some(m=>membershipKey(m)===membershipKey(scope))) throw new Error('Scope is not assigned to this user');
    localStorage.setItem(SCOPE_KEY,JSON.stringify(scope));
    window.dispatchEvent(new CustomEvent('atlas:scopechange',{detail:{scope}}));
    return scope;
  }

  async function api(path,options={}){
    const token=getToken();
    const scope=getScope();
    const headers=new Headers(options.headers||{});
    headers.set('accept','application/json');
    if(token) headers.set('authorization',`Bearer ${token}`);
    if(options.scoped!==false&&scope){
      headers.set('x-atlas-organization',scope.organization_id);
      headers.set('x-atlas-dba',scope.dba_id);
    }
    const response=await fetch(path,{...options,headers});
    if(response.status===401){
      clear();
      if(location.pathname!=='/signin.html') location.replace('/signin.html?reason=session');
    }
    return response;
  }

  async function login(email,password){
    const response=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({email,password})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data.error||'Unable to sign in');
    setSession(data);
    return data;
  }

  async function verify(){
    if(!getToken()) throw new Error('Missing session');
    const response=await api('/api/auth/me',{scoped:false});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data.error||'Session verification failed');
    const memberships=Array.isArray(data.memberships)?data.memberships:[];
    if(!memberships.length){ clear(); throw new Error('No active organization membership'); }
    localStorage.setItem(USER_KEY,JSON.stringify(data.user));
    localStorage.setItem(MEMBERSHIPS_KEY,JSON.stringify(memberships));
    let scope=getScope();
    if(!scope||!memberships.some(m=>membershipKey(m)===membershipKey(scope))) scope=memberships[0];
    localStorage.setItem(SCOPE_KEY,JSON.stringify(scope));
    return {...data,scope};
  }

  async function logout(){
    try{ await api('/api/auth/logout',{method:'POST',scoped:false}); } finally { clear(); location.replace('/signin.html'); }
  }

  function injectAccountControls(data){
    const host=document.querySelector('.top-actions'); if(!host) return;
    const memberships=data.memberships||[];
    let select=document.querySelector('[data-atlas-scope]');
    if(!select){
      select=document.createElement('select');
      select.setAttribute('data-atlas-scope','');
      select.setAttribute('aria-label','Organization and DBA');
      select.style.cssText='max-width:220px;padding:8px 10px;border-radius:12px;background:#0b1728;color:#eef6ff;border:1px solid rgba(130,180,230,.28)';
      host.prepend(select);
    }
    select.innerHTML=memberships.map((m,i)=>`<option value="${i}">${m.organization_id} / ${m.dba_id} · ${m.role}</option>`).join('');
    const scope=getScope();
    const selected=memberships.findIndex(m=>membershipKey(m)===membershipKey(scope));
    select.value=String(selected<0?0:selected);
    select.onchange=()=>{const m=memberships[Number(select.value)];if(m)setScope(m)};

    const profileName=document.querySelector('#profileName'); if(profileName) profileName.textContent=data.user?.display_name||data.user?.email||'ATLAS User';
    const roleNode=document.querySelector('.profile small'); if(roleNode) roleNode.textContent=(getScope()?.role||'').toUpperCase();
    if(!document.querySelector('[data-atlas-logout]')){
      const button=document.createElement('button'); button.type='button'; button.className='top-icon'; button.setAttribute('data-atlas-logout',''); button.setAttribute('aria-label','Sign out'); button.title='Sign out'; button.textContent='↪'; button.onclick=logout; host.appendChild(button);
    }
    window.addEventListener('atlas:scopechange',e=>{const r=document.querySelector('.profile small');if(r)r.textContent=(e.detail.scope?.role||'').toUpperCase()});
  }

  async function protectApp(){
    if(location.pathname!=='/app.html') return;
    document.documentElement.setAttribute('data-atlas-auth','pending');
    try{
      const data=await verify();
      injectAccountControls(data);
      document.documentElement.setAttribute('data-atlas-auth','ready');
      window.dispatchEvent(new CustomEvent('atlas:authready',{detail:data}));
    }catch{
      clear();
      location.replace('/signin.html?reason=session');
    }
  }

  window.ATLASAuth={login,logout,verify,api,getToken,getUser,getMemberships,getScope,setScope,clear,setSession};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',protectApp,{once:true}); else protectApp();
})();