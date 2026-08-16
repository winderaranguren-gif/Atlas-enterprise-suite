import { ATLAS_CAPABILITY_REGISTRY } from './capability-fusion.js';

const ORIGIN='https://atlasenterprisesuite.com';
const html=(body,status=200)=>new Response(body,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'public,max-age=300','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','content-security-policy':"default-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"}});
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const stateInfo=state=>state==='native-browser'
 ? {label:'Available in supported browser',detail:'Core browser-native interactions are implemented; device/browser support may vary.'}
 : state==='workflow-ready'
 ? {label:'Workflow foundation',detail:'Workflow UI is implemented; durable enterprise records use connected ATLAS systems or remain pending where explicitly noted.'}
 : {label:'Foundation',detail:'Architecture and workspace foundation are present; additional runtime services are still required.'};

const connections={
 lingua:'ATLAS Settings · Localization',
 'language-coach':'ATLAS Voice & Vision',
 academy:'ATLAS HR Training',
 'tax-compliance':'ATLAS Finance · Taxes',
 'tax-pro':'ATLAS Finance · Taxes',
 'candidate-hub':'ATLAS HR Recruiting',
 forms:'ATLAS Documents',
 stream:'ATLAS Stream Control',
 subscriptions:'ATLAS Subscription Control',
 personalization:'ATLAS Settings'
};

function publicItems(){return ATLAS_CAPABILITY_REGISTRY.map(item=>{
 const state=stateInfo(item.state);
 return {
  slug:item.slug,
  name:item.name,
  summary:item.summary,
  features:[...item.features],
  implementationState:item.state,
  statusLabel:state.label,
  statusDetail:state.detail,
  connectedAtlasWorkspace:connections[item.slug]||null,
  workspace:`${ORIGIN}/platform/capabilities/${encodeURIComponent(item.slug)}`
 };
})}

function page(){
 const items=publicItems();
 const cards=items.map(item=>`<article class="card"><div class="status">${esc(item.statusLabel)}</div><h2>${esc(item.name)}</h2><p>${esc(item.summary)}</p>${item.connectedAtlasWorkspace?`<div class="connection">Connected: ${esc(item.connectedAtlasWorkspace)}</div>`:''}<ul>${item.features.map(feature=>`<li>${esc(feature)}</li>`).join('')}</ul><a class="open" href="/platform/capabilities/${encodeURIComponent(item.slug)}">Open workspace</a></article>`).join('');
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#020711"><title>ATLAS Capabilities · Enterprise Suite</title><meta name="description" content="Explore ATLAS language, learning, tax, recruiting, forms, media, subscription and personalization capabilities with transparent implementation status."><style>:root{color-scheme:dark;--bg:#020711;--panel:#071522;--line:#173a56;--text:#eef7ff;--muted:#94adc2;--cyan:#7ee6ff;--blue:#2f8cff}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 12% 0,#0d2942 0,#020711 35rem),#020711;color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}header,main,footer{max-width:1240px;margin:auto;padding-left:22px;padding-right:22px}.top{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-top:18px;padding-bottom:18px}.brand{font-weight:900;letter-spacing:.28em;color:white;text-decoration:none}.nav{display:flex;gap:9px;flex-wrap:wrap}.nav a,.open{color:#d9efff;text-decoration:none;border:1px solid #245274;border-radius:999px;padding:9px 12px;font-size:.82rem}.hero{padding-top:58px;padding-bottom:42px}.eyebrow{color:var(--cyan);font-size:.72rem;font-weight:800;letter-spacing:.18em}.hero h1{font-size:clamp(2.7rem,7vw,6.8rem);line-height:.9;letter-spacing:-.055em;margin:14px 0 18px}.hero p{max-width:820px;color:var(--muted);font-size:1.06rem;line-height:1.7}.truth{display:inline-flex;margin-top:14px;padding:9px 12px;border:1px solid #315a74;border-radius:999px;color:#cde9f9;font-size:.8rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:15px;padding-bottom:60px}.card{padding:20px;border:1px solid var(--line);border-radius:20px;background:linear-gradient(180deg,#0a1d2eee,#061421ee);box-shadow:0 18px 60px #0004}.status{width:max-content;max-width:100%;padding:6px 9px;border:1px solid #2b658c;border-radius:999px;color:#93eaff;font-size:.7rem;text-transform:uppercase;letter-spacing:.08em}.card h2{margin:15px 0 9px}.card p,.card li{color:var(--muted);line-height:1.55}.card ul{padding-left:20px;min-height:9rem}.connection{margin:13px 0;padding:10px 12px;border:1px solid #235d46;border-radius:12px;background:#071e17;color:#baf8d7;font-size:.8rem}.open{display:inline-block;border-color:#2f8cff;background:linear-gradient(135deg,var(--cyan),var(--blue));color:#03111d;font-weight:800}.note{border-top:1px solid var(--line);padding-top:26px;padding-bottom:40px;color:var(--muted);line-height:1.65;font-size:.9rem}@media(max-width:640px){.top{align-items:flex-start;flex-direction:column}.hero{padding-top:34px}.card ul{min-height:0}}</style></head><body><header class="top"><a class="brand" href="/">ATLAS</a><nav class="nav"><a href="/">Home</a><a href="/login">Sign in</a><a href="/feeds/capabilities.json">JSON feed</a></nav></header><main><section class="hero"><div class="eyebrow">ATLAS CAPABILITY DIRECTORY</div><h1>One ecosystem.<br>Connected capabilities.</h1><p>ATLAS combines language, learning, tax workflows, recruiting, forms, media, subscription controls and personalization while keeping implementation status explicit. Protected workspaces require an ATLAS account and organization access.</p><div class="truth">${items.length} capability workspaces · status shown without placeholder claims</div></section><section class="grid">${cards}</section></main><footer class="note"><strong>Implementation transparency:</strong> “Available in supported browser” means the browser-native interaction exists but can depend on device support. “Workflow foundation” means the workspace exists while durable records either connect to an existing ATLAS system of record or remain pending where stated. ATLAS does not represent unsupported third-party services as connected.</footer></body></html>`;
}

export async function capabilityPublicRoutes(request,env,url){
 if(request.method!=='GET')return null;
 if(url.pathname==='/capabilities')return html(page());
 if(url.pathname==='/feeds/capabilities.json')return Response.json({ok:true,source:'ATLAS Enterprise Suite',count:ATLAS_CAPABILITY_REGISTRY.length,generatedFrom:'ATLAS_CAPABILITY_REGISTRY',items:publicItems()},{headers:{'cache-control':'public,max-age=300','access-control-allow-origin':'*','x-content-type-options':'nosniff'}});
 return null;
}
