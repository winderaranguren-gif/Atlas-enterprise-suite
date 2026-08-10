(()=>{
  'use strict';
  const form=document.getElementById('ai-form');
  const input=document.getElementById('ai-input');
  const send=document.getElementById('send-button');
  const conversation=document.getElementById('conversation');
  const status=document.getElementById('ai-status');
  const count=document.getElementById('character-count');
  const history=[];

  function setStatus(kind,label){status.className=`status ${kind}`;status.innerHTML='<span></span>'+label;}
  function addMessage(role,text,{error=false}={}){
    const article=document.createElement('article');
    article.className=`message ${role==='user'?'user-message':'atlas-message'}${error?' error-message':''}`;
    const label=document.createElement('div');
    label.className='message-label';
    label.textContent=role==='user'?'TÚ':'ATLAS';
    const content=document.createElement('p');
    content.textContent=text;
    article.append(label,content);
    conversation.append(article);
    conversation.scrollTop=conversation.scrollHeight;
    return article;
  }

  async function checkStatus(){
    try{
      const response=await fetch('/api/atlas-ai/status',{headers:{accept:'application/json'}});
      const data=await response.json();
      setStatus(data.configured?'ready':'offline',data.configured?'OpenAI conectado':'Falta configurar la clave');
    }catch{setStatus('offline','Servidor no disponible');}
  }

  async function submitPrompt(prompt){
    const clean=String(prompt||'').trim();
    if(!clean||send.disabled)return;
    addMessage('user',clean);
    history.push({role:'user',content:clean});
    input.value='';count.textContent='0 / 8000';send.disabled=true;
    conversation.setAttribute('aria-busy','true');
    const pending=addMessage('assistant','Pensando…');
    try{
      const response=await fetch('/api/atlas-ai/respond',{
        method:'POST',headers:{'content-type':'application/json','accept':'application/json'},
        body:JSON.stringify({messages:history.slice(-12),language:document.documentElement.lang||'es'})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.message||data.error||'No se pudo obtener una respuesta.');
      pending.remove();
      addMessage('assistant',data.output);
      history.push({role:'assistant',content:data.output});
      setStatus('ready','OpenAI conectado');
    }catch(error){
      pending.remove();
      addMessage('assistant',error.message||'ATLAS Intelligence no está disponible en este momento.',{error:true});
    }finally{send.disabled=false;conversation.setAttribute('aria-busy','false');input.focus();}
  }

  input.addEventListener('input',()=>{count.textContent=`${input.value.length} / 8000`;});
  input.addEventListener('keydown',(event)=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();form.requestSubmit();}});
  form.addEventListener('submit',(event)=>{event.preventDefault();submitPrompt(input.value);});
  document.querySelectorAll('[data-prompt]').forEach(button=>button.addEventListener('click',()=>submitPrompt(button.dataset.prompt)));
  checkStatus();
})();
