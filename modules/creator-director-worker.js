const JSON_HEADERS={
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store',
  'access-control-allow-origin':'*'
};
const HTML_HEADERS={
  'content-type':'text/html; charset=utf-8',
  'cache-control':'no-store',
  'x-content-type-options':'nosniff',
  'referrer-policy':'same-origin'
};

const MODES={
  reel:{label:'Reel / Short',format:'9:16',duration:15,preset:'studio',hookSeconds:2.5,ctaWindow:0.18},
  presenter:{label:'Presenter',format:'9:16',duration:30,preset:'natural',hookSeconds:3,ctaWindow:0.16},
  corporate:{label:'Corporate',format:'16:9',duration:45,preset:'corporate',hookSeconds:4,ctaWindow:0.15},
  cinematic:{label:'Cinematic',format:'16:9',duration:30,preset:'cinematic',hookSeconds:3,ctaWindow:0.2},
  ad:{label:'Social Ad',format:'9:16',duration:20,preset:'studio',hookSeconds:2,ctaWindow:0.22}
};

const CAPABILITIES=[
  {id:'brief',name:'Creative brief builder',state:'ready',engine:'atlas-js'},
  {id:'storyboard',name:'Deterministic storyboard',state:'ready',engine:'atlas-js'},
  {id:'timing',name:'Script timing',state:'ready',engine:'atlas-js'},
  {id:'quality-gates',name:'Creator quality gates',state:'ready',engine:'atlas-js'},
  {id:'handoff',name:'Native Studio handoff',state:'ready',engine:'browser-storage'},
  {id:'external-creative-provider',name:'External creative provider',state:'not-required',engine:'none'}
];

function json(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:JSON_HEADERS});}
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function cleanText(v,max=4000){return String(v||'').replace(/\s+/g,' ').trim().slice(0,max);}
function splitSentences(text){
  const clean=cleanText(text,12000);
  if(!clean)return [];
  return clean.split(/(?<=[.!?])\s+|\n+/).map(x=>x.trim()).filter(Boolean).slice(0,80);
}
function safeMode(value){return MODES[value]?value:'reel';}
function round2(v){return Math.round(v*100)/100;}

function buildRecipe(input={}){
  const mode=safeMode(input.mode);
  const profile=MODES[mode];
  const duration=clamp(Number(input.duration)||profile.duration,5,180);
  const format=['9:16','16:9','1:1'].includes(input.format)?input.format:profile.format;
  const tone=cleanText(input.tone,80)||'clear, confident, modern';
  const hook=cleanText(input.hook,220);
  const cta=cleanText(input.cta,220);
  const script=cleanText(input.script,12000);
  const sentences=splitSentences(script);
  const content=sentences.length?sentences:[hook||'Opening statement',cta||'Closing call to action'].filter(Boolean);
  const hookSeconds=Math.min(profile.hookSeconds,Math.max(1.25,duration*.16));
  const ctaSeconds=cta?Math.max(2,Math.min(6,duration*profile.ctaWindow)):0;
  const bodySeconds=Math.max(1,duration-hookSeconds-ctaSeconds);
  const bodyItems=Math.max(1,content.length-(hook?1:0)-(cta?1:0));
  const perBody=bodySeconds/bodyItems;
  const shots=[];
  let cursor=0;
  if(hook){
    shots.push({index:1,start:0,end:round2(hookSeconds),role:'hook',framing:'tight portrait',text:hook,visual:'Direct-to-camera opening with immediate subject prominence.'});
    cursor=hookSeconds;
  }
  const source=content.filter((s)=>s!==hook&&s!==cta);
  const framings=['medium portrait','tight portrait','medium with contextual space','detail / insert opportunity'];
  source.forEach((text,i)=>{
    const remaining=duration-ctaSeconds-cursor;
    const length=i===source.length-1?remaining:Math.min(perBody,remaining);
    const end=Math.max(cursor,Math.min(duration-ctaSeconds,cursor+length));
    shots.push({index:shots.length+1,start:round2(cursor),end:round2(end),role:'body',framing:framings[i%framings.length],text,visual:i%3===2?'Use a contextual insert only if the source footage actually contains one.':'Keep the speaker visually dominant.'});
    cursor=end;
  });
  if(cta){
    const start=Math.max(cursor,duration-ctaSeconds);
    shots.push({index:shots.length+1,start:round2(start),end:round2(duration),role:'cta',framing:'clean medium portrait',text:cta,visual:'Hold a stable closing frame long enough for the call to action to be read.'});
  }
  if(!shots.length)shots.push({index:1,start:0,end:round2(duration),role:'body',framing:'medium portrait',text:'Add a script or hook to build a detailed shot plan.',visual:'Use the strongest available source segment.'});

  const gates=[
    {id:'hook',label:'Hook lands early',pass:Boolean(hook)&&hookSeconds<=4,detail:hook?`Hook allocated to first ${round2(hookSeconds)}s.`:'Add a hook for a stronger opening.'},
    {id:'format',label:'Platform framing defined',pass:true,detail:`${format} output selected.`},
    {id:'captions',label:'Caption source available',pass:Boolean(script),detail:script?'Script can be converted into timed captions.':'No script supplied; captions will require SRT or manual entry.'},
    {id:'cta',label:'CTA included',pass:Boolean(cta),detail:cta?'CTA reserved near the end.':'Optional CTA is currently empty.'},
    {id:'duration',label:'Duration is bounded',pass:duration<=60||mode==='corporate',detail:`Target duration ${duration}s.`},
    {id:'privacy',label:'First-party workflow',pass:true,detail:'Recipe generation uses ATLAS logic only and sends no media to a creative SaaS provider.'}
  ];

  return {
    service:'atlas-creator-director',
    version:1,
    createdAt:new Date().toISOString(),
    externalProviders:[],
    mode,
    label:profile.label,
    creative:{tone,hook,cta,script},
    production:{format,duration,preset:profile.preset,fitMode:format==='9:16'?'blur':'crop',burnCaptions:Boolean(script),audioCleanup:true,compareBeforeAfter:mode==='reel'||mode==='ad'},
    shots,
    quality:{passed:gates.filter(x=>x.pass).length,total:gates.length,gates}
  };
}

function page(){
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>ATLAS Creator Director</title><style>
  :root{--bg:#020712;--panel:#071625;--line:#1f4969;--text:#f4f9ff;--muted:#91a8bc;--cyan:#55d9ff;--green:#51dca0;--amber:#ffd16d}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 85% -10%,#154978 0,transparent 34%),var(--bg);color:var(--text);font:14px Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.app{max-width:1320px;margin:auto;padding:18px}.hero,.card{border:1px solid var(--line);background:linear-gradient(145deg,#0a1f34,#05101b);border-radius:16px}.hero{padding:22px}.hero h1{margin:4px 0 7px;font-size:32px}.hero p{max-width:860px;color:var(--muted);line-height:1.55;margin:0}.pill{display:inline-block;border:1px solid #2d6b52;background:#08271e;color:#a9efcb;border-radius:999px;padding:6px 9px;font-size:10px}.grid{display:grid;grid-template-columns:minmax(320px,.75fr) minmax(0,1.25fr);gap:12px;margin-top:12px}.card{padding:14px}.card h2{font-size:14px;margin:0 0 10px}.field,.btn{width:100%;border:1px solid #2b638b;background:#071b2d;color:#fff;border-radius:9px;padding:10px}.field{margin:5px 0 9px}.btn{cursor:pointer;font-weight:700}.btn.primary{background:linear-gradient(135deg,#147de3,#15a9d5);border-color:#44c8f1}.btn.alt{background:#0b2943}.row{display:grid;grid-template-columns:1fr 1fr;gap:8px}.status{border:1px solid #1d425e;background:#071421;border-radius:10px;padding:10px;color:#9eb6c9;font-size:11px;line-height:1.45}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px}.metric{border:1px solid #1c425e;background:#071421;border-radius:10px;padding:10px}.metric span{display:block;color:#7894a9;font-size:9px}.metric b{font-size:16px}.shot{display:grid;grid-template-columns:58px 90px 1fr;gap:8px;padding:9px 0;border-bottom:1px solid #173650}.shot small{color:#7f9ab0}.gate{display:flex;justify-content:space-between;gap:10px;padding:8px;border-bottom:1px solid #173650}.pass{color:var(--green)}.warn{color:var(--amber)}pre{white-space:pre-wrap;word-break:break-word;color:#a8c5d9;font-size:10px;max-height:190px;overflow:auto}@media(max-width:860px){.grid{grid-template-columns:1fr}.row,.metrics{grid-template-columns:1fr 1fr}}@media(max-width:520px){.app{padding:10px}.row,.metrics{grid-template-columns:1fr}.shot{grid-template-columns:50px 75px 1fr}}
  </style></head><body><main class="app"><section class="hero"><span class="pill">ATLAS FIRST-PARTY CREATIVE DIRECTION</span><h1>Creator Director</h1><p>Turn an idea, script, hook and call to action into a production recipe and storyboard. The planning engine is deterministic ATLAS code, uses zero external creative providers, and hands the recipe to Native Studio.</p></section><div class="grid"><section class="card"><h2>Creative brief</h2><label>Mode</label><select class="field" id="mode"><option value="reel">Reel / Short</option><option value="presenter">Presenter</option><option value="ad">Social Ad</option><option value="corporate">Corporate</option><option value="cinematic">Cinematic</option></select><div class="row"><label>Duration<input class="field" id="duration" type="number" min="5" max="180" value="15"></label><label>Format<select class="field" id="format"><option>9:16</option><option>16:9</option><option>1:1</option></select></label></div><label>Tone</label><input class="field" id="tone" value="clear, confident, modern"><label>Hook</label><textarea class="field" id="hook" rows="2" placeholder="The first line viewers should hear or read"></textarea><label>Script</label><textarea class="field" id="script" rows="8" placeholder="Paste the content you want to turn into a video"></textarea><label>Call to action</label><textarea class="field" id="cta" rows="2" placeholder="What should the viewer do next?"></textarea><button class="btn primary" id="build">Build production plan</button></section><section class="card"><h2>Director output</h2><div class="metrics"><div class="metric"><span>MODE</span><b id="mMode">—</b></div><div class="metric"><span>SHOTS</span><b id="mShots">0</b></div><div class="metric"><span>QUALITY</span><b id="mQuality">—</b></div></div><div id="summary" class="status">Build a plan to generate the storyboard.</div><h2 style="margin-top:14px">Storyboard</h2><div id="shots"><div class="status">No shot plan yet.</div></div><h2 style="margin-top:14px">Quality gates</h2><div id="gates"><div class="status">No checks yet.</div></div><div class="row" style="margin-top:12px"><button class="btn alt" id="save" disabled>Download recipe</button><button class="btn primary" id="open" disabled>Save & open Native Studio</button></div><details style="margin-top:10px"><summary>Recipe JSON</summary><pre id="raw">{}</pre></details></section></div></main><script>
  const e=id=>document.getElementById(id);let recipe=null;const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const syncMode=()=>{const presets={reel:['15','9:16'],presenter:['30','9:16'],ad:['20','9:16'],corporate:['45','16:9'],cinematic:['30','16:9']};const p=presets[e('mode').value];e('duration').value=p[0];e('format').value=p[1]};e('mode').onchange=syncMode;
  async function build(){e('build').disabled=true;e('build').textContent='Directing…';try{const payload={mode:e('mode').value,duration:Number(e('duration').value),format:e('format').value,tone:e('tone').value,hook:e('hook').value,script:e('script').value,cta:e('cta').value};const r=await fetch('/api/studio/director/recipe',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});recipe=await r.json();if(!r.ok)throw new Error(recipe.error||'Director request failed');render()}catch(err){e('summary').textContent=err.message}finally{e('build').disabled=false;e('build').textContent='Build production plan'}}
  function render(){e('mMode').textContent=recipe.label;e('mShots').textContent=recipe.shots.length;e('mQuality').textContent=recipe.quality.passed+'/'+recipe.quality.total;e('summary').textContent=recipe.production.format+' · '+recipe.production.duration+'s · '+recipe.production.preset+' look · '+(recipe.externalProviders.length?'external providers':'0 external providers');e('shots').innerHTML=recipe.shots.map(s=>'<div class="shot"><b>#'+s.index+'</b><small>'+s.start+'–'+s.end+'s<br>'+esc(s.role)+'</small><div><b>'+esc(s.text)+'</b><br><small>'+esc(s.framing)+' · '+esc(s.visual)+'</small></div></div>').join('');e('gates').innerHTML=recipe.quality.gates.map(g=>'<div class="gate"><div><b>'+esc(g.label)+'</b><br><small>'+esc(g.detail)+'</small></div><b class="'+(g.pass?'pass':'warn')+'">'+(g.pass?'PASS':'CHECK')+'</b></div>').join('');e('raw').textContent=JSON.stringify(recipe,null,2);e('save').disabled=false;e('open').disabled=false}
  e('build').onclick=build;e('save').onclick=()=>{if(!recipe)return;const b=new Blob([JSON.stringify(recipe,null,2)],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='atlas-creator-recipe.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};e('open').onclick=()=>{if(!recipe)return;localStorage.setItem('atlas.creator.recipe',JSON.stringify(recipe));location.href='/studio/production'};
  </script></body></html>`;
}

export async function handleCreatorDirector(request){
  const url=new URL(request.url);
  if(url.pathname==='/api/studio/director/capabilities'&&request.method==='GET')return json({service:'atlas-creator-director',version:1,externalProviders:[],capabilities:CAPABILITIES,modes:MODES});
  if(url.pathname==='/api/studio/director/recipe'&&request.method==='POST'){
    let body={};
    try{body=await request.json();}catch{return json({ok:false,error:'Request body must be valid JSON.'},400);}
    return json(buildRecipe(body));
  }
  if((url.pathname==='/studio/director'||url.pathname==='/studio/creator')&&request.method==='GET')return new Response(page(),{headers:HTML_HEADERS});
  return null;
}
