(()=>{
'use strict';

const config=window.ATLAS_CONFIG||{};
const sdk=window.supabase;
const $=s=>document.querySelector(s);
let client=null;
let session=null;

function status(text,kind='info'){
  const el=$('#pi-status');
  el.textContent=text;
  el.dataset.kind=kind;
}
function busy(value){
  $('#pi-submit').disabled=value;
  $('#pi-input').disabled=value;
}
function showAuthenticated(value){
  $('#pi-app').classList.toggle('hidden',!value);
  $('#auth-required').classList.toggle('hidden',value);
}
function functionUrl(){
  return `${String(config.supabaseUrl||'').replace(/\/$/,'')}/functions/v1/atlas-personal-intelligence`;
}

async function invoke(input){
  if(!session?.access_token)throw new Error('authentication_required');
  const response=await fetch(functionUrl(),{
    method:'POST',
    headers:{
      apikey:config.supabasePublishableKey,
      Authorization:`Bearer ${session.access_token}`,
      'Content-Type':'application/json'
    },
    body:JSON.stringify({input})
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    const error=new Error(data?.error||`HTTP ${response.status}`);
    error.payload=data;
    throw error;
  }
  return data;
}

async function initialize(){
  if(!sdk?.createClient||!config.supabaseUrl||!config.supabasePublishableKey){
    showAuthenticated(false);
    return;
  }
  client=sdk.createClient(config.supabaseUrl,config.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data,error}=await client.auth.getSession();
  if(error)throw error;
  session=data?.session||null;
  showAuthenticated(Boolean(session?.user));
  if(session?.user){
    $('#pi-user').textContent=session.user.email||session.user.id;
    status('Personal Intelligence conectado a ATLAS Core. La solicitud se ejecutará en el backend autenticado.','ok');
  }
  client.auth.onAuthStateChange((_event,nextSession)=>{
    window.setTimeout(()=>{
      session=nextSession||null;
      showAuthenticated(Boolean(session?.user));
      if(session?.user)$('#pi-user').textContent=session.user.email||session.user.id;
    },0);
  });
}

$('#pi-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const input=$('#pi-input').value.trim();
  if(!input)return;
  busy(true);
  status('ATLAS está procesando la solicitud en el backend seguro…');
  $('#pi-output').textContent='';
  try{
    const result=await invoke(input);
    $('#pi-output').textContent=result.output||'ATLAS completó la ejecución sin texto de salida.';
    $('#pi-provider').textContent=result.provider||'OpenAI · server-side';
    $('#pi-model').textContent=result.model||'gpt-5.6';
    $('#pi-last-run').textContent=new Intl.DateTimeFormat('es-US',{dateStyle:'medium',timeStyle:'short'}).format(new Date());
    status(`Ejecución completada${result.requestId?` · request ${result.requestId}`:''}.`,'ok');
  }catch(error){
    const code=error?.message||'request_failed';
    if(code==='provider_not_configured')status('El módulo está desplegado y autenticado, pero falta activar el secreto del proveedor de IA en el backend.','error');
    else if(code==='authentication_required')status('La sesión ATLAS expiró. Vuelve a iniciar sesión.','error');
    else status(`No se pudo completar la ejecución: ${code}.`,'error');
  }finally{
    busy(false);
  }
});

$('#pi-clear').addEventListener('click',()=>{
  $('#pi-input').value='';
  $('#pi-output').textContent='';
  status('Consulta limpia. Personal Intelligence sigue conectado.');
});

initialize().catch(error=>{
  showAuthenticated(false);
  console.error('ATLAS Personal Intelligence initialization failed',error);
});
})();
