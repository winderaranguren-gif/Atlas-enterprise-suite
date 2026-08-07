(()=>{'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const KEY='atlas-health-twin-v1', AVATAR_KEY='atlas-health-twin-avatar';
if(window.ATLAS_HOLOGRAM_DATA) $('#avatarImage').src=window.ATLAS_HOLOGRAM_DATA;
const baseAvatar=$('#avatarImage').src;
const initial=()=>({profile:{},scans:[],vitals:[],labs:[],audit:[],devices:{},settings:{lang:'es'}});
let state; try{state={...initial(),...JSON.parse(localStorage.getItem(KEY)||'null')}}catch{state=initial()}
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
const now=()=>new Date().toISOString();
const fmt=d=>d?new Date(d).toLocaleString(): '—';
const num=v=>v===''||v==null?null:Number(v);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
function log(action,detail=''){state.audit.unshift({time:now(),action,detail});state.audit=state.audit.slice(0,150);save();renderAudit()}
function toast(msg){const el=document.createElement('div');el.textContent=msg;Object.assign(el.style,{position:'fixed',right:'18px',bottom:'18px',zIndex:99,padding:'12px 15px',background:'#103248',border:'1px solid rgba(86,221,255,.45)',borderRadius:'12px',boxShadow:'0 18px 50px rgba(0,0,0,.4)'});document.body.append(el);setTimeout(()=>el.remove(),2600)}
function setForm(id,obj,map){Object.entries(map).forEach(([field,key])=>{const el=$(field); if(el&&obj[key]!=null)el.value=obj[key]})}
function getProfileQuality(){const p=state.profile;return Math.round([p.age,p.height,p.weight].filter(v=>v!=null&&v!=='').length/3*100)}
function getScanQuality(){const s=state.scans[0];if(!s)return 0;return Math.round(['source','date','bodyFat','leanMass','posture','symmetry'].filter(k=>s[k]!=null&&s[k]!=='').length/6*100)}
function getVitalsQuality(){const v=state.vitals[0];if(!v)return 0;const captured=['heartRate','spo2','systolic','diastolic','temperature','respiratoryRate'].filter(k=>v[k]!=null).length;return Math.round(captured/6*100)}
function getLabsQuality(){const l=state.labs[0];if(!l)return 0;return Math.round(['analyzer','assay','analyte','value','unit','qc'].filter(k=>l[k]!=null&&l[k]!=='').length/6*100)}
function completeness(){return Math.round((getProfileQuality()+getScanQuality()+getVitalsQuality()+getLabsQuality())/4)}
function bmiInfo(){const p=state.profile;if(!p.height||!p.weight)return null;const bmi=p.weight/((p.height/100)**2);let label='Métrica de contexto';if(p.age&&p.age<20)label='Interpretación pediátrica desactivada: requiere referencia por edad y sexo';else if(p.age>=20){if(bmi<18.5)label='Categoría de cribado: bajo rango';else if(bmi<25)label='Categoría de cribado: rango medio';else if(bmi<30)label='Categoría de cribado: rango elevado';else label='Categoría de cribado: rango muy elevado'}return{value:bmi,label}}
function labStatus(l){if(l.qc==='fail')return 'QC falló';if(l.refMin!=null&&l.value<l.refMin)return 'Fuera de referencia';if(l.refMax!=null&&l.value>l.refMax)return 'Fuera de referencia';if(l.refMin!=null||l.refMax!=null)return 'Dentro de referencia';return 'Sin referencia'}
function reviewState(){const failed=state.labs.some(l=>l.qc==='fail');const out=state.labs.some(l=>labStatus(l)==='Fuera de referencia');if(failed)return{title:'QC falló',note:'No usar el resultado'};if(out)return{title:'Revisar',note:'Resultado fuera del rango registrado'};if(completeness()<50)return{title:'Pendiente',note:'Faltan datos'};return{title:'Listo',note:'Resumen de bienestar disponible'}}
function renderKPIs(){const c=completeness(),r=reviewState();$('#kpiCompleteness').textContent=c+'%';$('#kpiCompletenessNote').textContent=c?'Datos consolidados':'Sin registros';const s=state.scans[0];$('#kpiScan').textContent=s?new Date(s.date).toLocaleDateString():'—';$('#kpiScanNote').textContent=s?esc(s.source):'Pendiente';$('#kpiDevices').textContent=Object.values(state.devices).filter(Boolean).length;$('#kpiReview').textContent=r.title;$('#kpiReviewNote').textContent=r.note;$('#qualityProfile').textContent=getProfileQuality()+'%';$('#qualityScan').textContent=getScanQuality()+'%';$('#qualityVitals').textContent=getVitalsQuality()+'%';$('#qualityLabs').textContent=getLabsQuality()+'%'}
function renderProfile(){const p=state.profile;setForm(null,p,{'#age':'age','#height':'height','#weight':'weight','#waist':'waist','#profileNotes':'notes'});const b=bmiInfo();$('#bmiNote').textContent=b?`IMC descriptivo: ${b.value.toFixed(1)}. ${b.label}. No es un diagnóstico ni una evaluación completa de salud.`:'ATLAS calculará métricas de contexto cuando se introduzcan edad, altura y peso.'}
function renderSummary(){const list=[];const p=state.profile,b=bmiInfo(),s=state.scans[0],v=state.vitals[0],l=state.labs[0];if(!p.age||!p.height||!p.weight)list.push(['Perfil incompleto','Añade edad, altura y peso para contextualizar las tendencias.']);else list.push(['Perfil registrado',b?`IMC descriptivo ${b.value.toFixed(1)}; ${b.label.toLowerCase()}.`:'Datos básicos disponibles.']);if(s)list.push(['Escaneo corporal',`Último registro: ${fmt(s.date)}. La forma externa y la composición estimada sirven para seguimiento, no para detectar enfermedad interna.`]);else list.push(['Escaneo pendiente','Registra un escaneo o importa mediciones de un sensor 3D.']);if(v)list.push(['Signos vitales capturados',`Última lectura desde ${v.source||'fuente no identificada'}. ATLAS muestra valores y tendencias sin diagnóstico automático.`]);else list.push(['Sin signos vitales','Conecta un dispositivo compatible, un puente serial o usa el simulador.']);if(l)list.push(['Resultado IVD registrado',`${l.analyte}: ${l.value} ${l.unit||''} · ${labStatus(l)}.`]);else list.push(['Sin resultados IVD','La gota de sangre requiere un analizador o cartucho validado; ATLAS recibe el resultado.']);const r=reviewState();list.push(['Estado del resumen',`${r.title} — ${r.note}.`]);$('#summaryList').innerHTML=list.map((x,i)=>`<div class="summary-item"><span class="summary-icon">${i+1}</span><div><strong>${esc(x[0])}</strong><p>${esc(x[1])}</p></div></div>`).join('');renderKPIs()}
function renderScans(){$('#scanRows').innerHTML=state.scans.length?state.scans.map((s,i)=>`<tr><td>${fmt(s.date)}</td><td>${esc(s.source)}</td><td>${s.bodyFat??'—'}</td><td>${s.leanMass??'—'}</td><td>${s.posture??'—'}</td><td><button class="btn" data-del-scan="${i}">Eliminar</button></td></tr>`).join(''):'<tr><td colspan="6">Sin escaneos</td></tr>';$$('[data-del-scan]').forEach(b=>b.onclick=()=>{state.scans.splice(+b.dataset.delScan,1);save();log('scan.deleted');renderAll()})}
function renderVitals(){$('#vitalRows').innerHTML=state.vitals.length?state.vitals.slice(0,20).map((v,i)=>`<tr><td>${fmt(v.time)}</td><td>${v.heartRate??'—'}</td><td>${v.spo2??'—'}</td><td>${v.systolic??'—'}/${v.diastolic??'—'}</td><td>${v.temperature??'—'}</td><td>${esc(v.source||'')}</td><td><button class="btn" data-del-vital="${i}">Eliminar</button></td></tr>`).join(''):'<tr><td colspan="7">Sin lecturas</td></tr>';$$('[data-del-vital]').forEach(b=>b.onclick=()=>{state.vitals.splice(+b.dataset.delVital,1);save();log('vital.deleted');renderAll()})}
function renderLabs(){$('#labRows').innerHTML=state.labs.length?state.labs.map((l,i)=>`<tr><td>${fmt(l.time)}</td><td>${esc(l.analyte)}</td><td>${l.value} ${esc(l.unit||'')}</td><td>${l.refMin??'—'}–${l.refMax??'—'}</td><td>${esc(labStatus(l))}</td><td><button class="btn" data-del-lab="${i}">Eliminar</button></td></tr>`).join(''):'<tr><td colspan="6">Sin resultados</td></tr>';$$('[data-del-lab]').forEach(b=>b.onclick=()=>{state.labs.splice(+b.dataset.delLab,1);save();log('lab.deleted');renderAll()})}
function renderAudit(){$('#auditLog').innerHTML=state.audit.length?state.audit.map(a=>`<div class="audit-item"><strong>${esc(a.action)}</strong><small>${fmt(a.time)} · ${esc(a.detail||'')}</small></div>`).join(''):'<div class="note">Sin actividad registrada.</div>'}
function trendData(metric){if(metric==='weight')return state.profile.weight?[{x:new Date(state.profile.updated||now()),y:+state.profile.weight}]:[];if(metric==='bodyFat'||metric==='posture')return [...state.scans].reverse().filter(s=>s[metric]!=null).map(s=>({x:new Date(s.date),y:+s[metric]}));return [...state.vitals].reverse().filter(v=>v[metric]!=null).map(v=>({x:new Date(v.time),y:+v[metric]}))}
function renderChart(){const metric=$('#trendMetric').value,d=trendData(metric),box=$('#trendChart');if(!d.length){box.innerHTML='<div style="height:100%;display:grid;place-items:center;color:#91a9ba">Sin datos suficientes</div>';return}const w=800,h=240,p=28,ys=d.map(x=>x.y),min=Math.min(...ys),max=Math.max(...ys),range=(max-min)||1;const pts=d.map((o,i)=>`${p+(i/(Math.max(1,d.length-1)))*(w-p*2)},${h-p-((o.y-min)/range)*(h-p*2)}`).join(' ');box.innerHTML=`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#56ddff"/><stop offset="1" stop-color="#4b7dff"/></linearGradient></defs><polyline points="${pts}" fill="none" stroke="url(#g)" stroke-width="4" vector-effect="non-scaling-stroke"/>${d.map((o,i)=>{const x=p+(i/(Math.max(1,d.length-1)))*(w-p*2),y=h-p-((o.y-min)/range)*(h-p*2);return `<circle cx="${x}" cy="${y}" r="5" fill="#56ddff"><title>${o.y}</title></circle>`}).join('')}<text x="${p}" y="20" fill="#91a9ba" font-size="12">min ${min}</text><text x="${w-p-70}" y="20" fill="#91a9ba" font-size="12">max ${max}</text></svg>`}
function renderAll(){renderProfile();renderScans();renderVitals();renderLabs();renderAudit();renderSummary();renderChart()}
$('#profileForm').onsubmit=e=>{e.preventDefault();state.profile={age:num($('#age').value),height:num($('#height').value),weight:num($('#weight').value),waist:num($('#waist').value),notes:$('#profileNotes').value.trim(),updated:now()};save();log('profile.saved','Perfil físico actualizado');renderAll();toast('Perfil guardado')};
$('#scanForm').onsubmit=e=>{e.preventDefault();state.scans.unshift({source:$('#scanSource').value,date:$('#scanDate').value?new Date($('#scanDate').value).toISOString():now(),bodyFat:num($('#bodyFat').value),leanMass:num($('#leanMass').value),shoulders:num($('#shoulders').value),hips:num($('#hips').value),posture:num($('#posture').value),symmetry:num($('#symmetry').value)});save();log('scan.saved','Sesión de escaneo corporal');e.target.reset();$('#scanDate').value=new Date().toISOString().slice(0,16);renderAll();toast('Escaneo guardado')};
$('#vitalsForm').onsubmit=e=>{e.preventDefault();const v={time:now(),heartRate:num($('#heartRate').value),spo2:num($('#spo2').value),systolic:num($('#systolic').value),diastolic:num($('#diastolic').value),temperature:num($('#temperature').value),respiratoryRate:num($('#respiratoryRate').value),source:$('#vitalSource').value.trim()||'manual'};state.vitals.unshift(v);save();log('vital.saved',v.source);renderAll();toast('Signos vitales guardados')};
$('#labForm').onsubmit=e=>{e.preventDefault();const l={time:now(),analyzer:$('#analyzer').value.trim(),assay:$('#assay').value.trim(),lot:$('#lot').value.trim(),expiry:$('#expiry').value,analyte:$('#analyte').value.trim(),value:num($('#labValue').value),unit:$('#labUnit').value.trim(),refMin:num($('#refMin').value),refMax:num($('#refMax').value),qc:$('#qc').value};if(!l.analyte||l.value==null)return toast('Analito y resultado son obligatorios');state.labs.unshift(l);save();log('lab.saved',`${l.analyte} · ${l.analyzer||'sin analizador'}`);e.target.reset();renderAll();toast('Resultado IVD guardado')};
$$('.tab').forEach(b=>b.onclick=()=>{$$('.tab').forEach(x=>x.classList.toggle('active',x===b));$$('.panel').forEach(p=>p.classList.toggle('active',p.id==='panel-'+b.dataset.tab));if(b.dataset.tab==='trends')renderChart()});
$('#refreshSummary').onclick=$('#summarizeBtn').onclick=()=>{renderSummary();const text=$('#summaryList').innerText.replace(/\n+/g,'. ');$('#assistantSpeech').textContent=text;log('assistant.summary','Resumen actualizado')};
$('#speakBtn').onclick=()=>{if(!('speechSynthesis'in window))return toast('La voz no está disponible en este navegador');speechSynthesis.cancel();const u=new SpeechSynthesisUtterance($('#assistantSpeech').textContent);u.lang=$('#lang').value==='en'?'en-US':'es-US';speechSynthesis.speak(u);log('assistant.spoke')};
$('#avatarUpload').onchange=e=>{const f=e.target.files[0];if(!f)return;if(f.size>2500000)return toast('La imagen debe pesar menos de 2.5 MB');const r=new FileReader();r.onload=()=>{localStorage.setItem(AVATAR_KEY,r.result);$('#avatarImage').src=r.result;log('avatar.updated',f.name);toast('Holograma actualizado')};r.readAsDataURL(f)};
$('#resetAvatar').onclick=()=>{localStorage.removeItem(AVATAR_KEY);$('#avatarImage').src=baseAvatar;log('avatar.reset')};
$('#simulateVitals').onclick=()=>{const v={time:now(),heartRate:72,spo2:98,systolic:118,diastolic:76,temperature:36.8,respiratoryRate:16,source:'ATLAS simulator'};state.vitals.unshift(v);state.devices.simulator=true;save();log('device.simulated','Fictitious vitals generated');renderAll();toast('Datos ficticios generados')};
$('#btHeart').onclick=async()=>{try{if(!navigator.bluetooth)throw new Error('Web Bluetooth no disponible');const dev=await navigator.bluetooth.requestDevice({filters:[{services:['heart_rate']}]});const server=await dev.gatt.connect(),service=await server.getPrimaryService('heart_rate'),ch=await service.getCharacteristic('heart_rate_measurement');await ch.startNotifications();ch.addEventListener('characteristicvaluechanged',e=>{const d=e.target.value,flags=d.getUint8(0),hr=(flags&1)?d.getUint16(1,true):d.getUint8(1);$('#heartRate').value=hr;$('#vitalSource').value=`Bluetooth: ${dev.name||'Heart Rate'}`;$('#deviceStatus').textContent='Bluetooth conectado';state.devices.bluetooth=true;save();renderKPIs()});log('device.connected',dev.name||'Bluetooth heart rate');toast('Monitor cardíaco conectado')}catch(err){toast(err.message);log('device.error',err.message)}};
$('#serialBtn').onclick=async()=>{
  try{
    if(!navigator.serial) throw new Error('Web Serial no disponible');
    const port=await navigator.serial.requestPort();
    await port.open({baudRate:115200});
    state.devices.serial=true;
    save();
    $('#deviceStatus').textContent='Serial conectado';
    renderKPIs();
    log('device.connected','Web Serial 115200');
    const decoder=new TextDecoderStream();
    port.readable.pipeTo(decoder.writable).catch(()=>{});
    const reader=decoder.readable.getReader();
    let buffer='';
    while(true){
      const {value,done}=await reader.read();
      if(done) break;
      buffer+=value;
      let idx;
      while((idx=buffer.indexOf('\n'))>=0){
        const line=buffer.slice(0,idx).trim();
        buffer=buffer.slice(idx+1);
        if(!line) continue;
        try{
          const d=JSON.parse(line);
          [['heartRate','heartRate'],['spo2','spo2'],['systolic','systolic'],['diastolic','diastolic'],['temperature','temperature'],['respiratoryRate','respiratoryRate']].forEach(([k,id])=>{
            if(d[k]!=null) $('#'+id).value=d[k];
          });
          $('#vitalSource').value=d.source||'Serial bridge';
          if(d.analyte&&d.value!=null){
            $('#analyte').value=d.analyte;
            $('#labValue').value=d.value;
            $('#labUnit').value=d.unit||'';
            $('#analyzer').value=d.analyzer||'Serial analyzer';
          }
        }catch{
          log('serial.invalid',line.slice(0,80));
        }
      }
    }
  }catch(err){
    toast(err.message);
    log('device.error',err.message);
  }
};
$('#trendMetric').onchange=renderChart;
$('#clearScans').onclick=()=>{if(confirm('¿Borrar todos los escaneos?')){state.scans=[];save();log('scan.cleared');renderAll()}};$('#clearVitals').onclick=()=>{if(confirm('¿Borrar todas las lecturas?')){state.vitals=[];save();log('vitals.cleared');renderAll()}};$('#clearLabs').onclick=()=>{if(confirm('¿Borrar todos los resultados?')){state.labs=[];save();log('labs.cleared');renderAll()}};$('#clearAudit').onclick=()=>{if(confirm('¿Borrar la auditoría local?')){state.audit=[];save();renderAll()}};
$('#exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify({exportedAt:now(),module:'ATLAS Holographic Health Twin',data:state},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`atlas-health-twin-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);log('data.exported')};
$('#lang').onchange=e=>{state.settings.lang=e.target.value;save();document.documentElement.lang=e.target.value;toast(e.target.value==='en'?'Language preference saved. Full clinical terminology remains bilingual-ready.':'Preferencia de idioma guardada.')};
const storedAvatar=localStorage.getItem(AVATAR_KEY);if(storedAvatar)$('#avatarImage').src=storedAvatar;$('#lang').value=state.settings?.lang||'es';$('#scanDate').value=new Date().toISOString().slice(0,16);renderAll();
})();