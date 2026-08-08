(()=>{
'use strict';

const STORAGE_KEY='atlas-regional-context-v1';
const CORE_ID='ATLAS-GLOBAL-CORE';

const REGIONS={
  global:{label:'ATLAS Global',countries:[['GLOBAL','Global / Multinacional']]},
  northAmerica:{label:'ATLAS Norteamérica',countries:[['US','Estados Unidos'],['CA','Canadá'],['MX','México']]},
  centralAmerica:{label:'ATLAS Centroamérica',countries:[['BZ','Belice'],['CR','Costa Rica'],['SV','El Salvador'],['GT','Guatemala'],['HN','Honduras'],['NI','Nicaragua'],['PA','Panamá']]},
  caribbean:{label:'ATLAS Caribe',countries:[['PR','Puerto Rico'],['DO','República Dominicana'],['CU','Cuba'],['JM','Jamaica'],['HT','Haití'],['BS','Bahamas'],['BB','Barbados'],['TT','Trinidad y Tobago']]},
  southAmerica:{label:'ATLAS Suramérica',countries:[['AR','Argentina'],['BO','Bolivia'],['BR','Brasil'],['CL','Chile'],['CO','Colombia'],['EC','Ecuador'],['GY','Guyana'],['PY','Paraguay'],['PE','Perú'],['SR','Surinam'],['UY','Uruguay'],['VE','Venezuela']]},
  europe:{label:'ATLAS Europa',countries:[['EU','Europa / Multipaís'],['ES','España'],['PT','Portugal'],['FR','Francia'],['DE','Alemania'],['IT','Italia'],['GB','Reino Unido'],['IE','Irlanda'],['NL','Países Bajos'],['BE','Bélgica'],['CH','Suiza'],['AT','Austria'],['SE','Suecia'],['NO','Noruega'],['DK','Dinamarca'],['FI','Finlandia'],['PL','Polonia'],['CZ','Chequia'],['GR','Grecia'],['RO','Rumania'],['UA','Ucrania']]},
  africa:{label:'ATLAS África',countries:[['AFRICA','África / Multipaís'],['ZA','Sudáfrica'],['NG','Nigeria'],['EG','Egipto'],['KE','Kenia'],['GH','Ghana'],['MA','Marruecos'],['DZ','Argelia'],['TN','Túnez'],['ET','Etiopía'],['TZ','Tanzania'],['UG','Uganda'],['AO','Angola'],['MZ','Mozambique'],['SN','Senegal'],['CI','Costa de Marfil']]},
  asia:{label:'ATLAS Asia',countries:[['ASIA','Asia / Multipaís'],['CN','China'],['JP','Japón'],['KR','Corea del Sur'],['IN','India'],['SG','Singapur'],['MY','Malasia'],['TH','Tailandia'],['VN','Vietnam'],['ID','Indonesia'],['PH','Filipinas'],['AE','Emiratos Árabes Unidos'],['SA','Arabia Saudita'],['IL','Israel'],['TR','Turquía'],['PK','Pakistán'],['BD','Bangladés']]},
  oceania:{label:'ATLAS Oceanía',countries:[['OCEANIA','Oceanía / Multipaís'],['AU','Australia'],['NZ','Nueva Zelanda'],['FJ','Fiyi'],['PG','Papúa Nueva Guinea'],['WS','Samoa'],['TO','Tonga']]},
  antarctica:{label:'ATLAS Antártida',countries:[['AQ','Antártida / Investigación']]}
};

const DEFAULT_CONTEXT={region:'global',country:'GLOBAL',organization:null,user:null};

const MODULE_POLICY={
  // ATLAS shares one module catalog globally. Regional overrides are additive and
  // can be introduced here without cloning the application or its data model.
  global:{include:'*'},
  northAmerica:{include:'*'},
  centralAmerica:{include:'*'},
  caribbean:{include:'*'},
  southAmerica:{include:'*'},
  europe:{include:'*'},
  africa:{include:'*'},
  asia:{include:'*'},
  oceania:{include:'*'},
  antarctica:{include:'*'}
};

function loadContext(){
  try{
    const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(parsed && REGIONS[parsed.region]) return normalize(parsed);
  }catch{}
  return {...DEFAULT_CONTEXT};
}

function normalize(value){
  const region=REGIONS[value?.region]?value.region:'global';
  const countries=REGIONS[region].countries;
  const validCountry=countries.some(([code])=>code===value?.country);
  return {
    region,
    country:validCountry?value.country:countries[0][0],
    organization:value?.organization??null,
    user:value?.user??null
  };
}

let context=loadContext();

function save(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(context));
}

function regionLabel(region=context.region){
  return REGIONS[region]?.label||REGIONS.global.label;
}

function countryLabel(region=context.region,country=context.country){
  return REGIONS[region]?.countries.find(([code])=>code===country)?.[1]||country;
}

function getContext(){
  return Object.freeze({
    coreId:CORE_ID,
    ...context,
    regionLabel:regionLabel(),
    countryLabel:countryLabel(),
    modulePolicy:MODULE_POLICY[context.region]||MODULE_POLICY.global
  });
}

function emit(){
  const detail=getContext();
  document.documentElement.dataset.atlasRegion=detail.region;
  document.documentElement.dataset.atlasCountry=detail.country;
  window.dispatchEvent(new CustomEvent('atlas:region-changed',{detail}));
}

function setContext(next={}){
  context=normalize({...context,...next});
  save();
  renderSwitcher();
  emit();
  return getContext();
}

function setRegion(region){
  if(!REGIONS[region]) return getContext();
  return setContext({region,country:REGIONS[region].countries[0][0]});
}

function setCountry(country){
  return setContext({country});
}

function registerRegion(key,definition){
  if(!key||!definition?.label||!Array.isArray(definition.countries)) throw new Error('Invalid ATLAS region definition');
  REGIONS[key]={label:definition.label,countries:definition.countries};
  MODULE_POLICY[key]=definition.modulePolicy||{include:'*'};
  renderSwitcher();
}

function ensureStyles(){
  if(document.getElementById('atlas-regional-navigation-style')) return;
  const style=document.createElement('style');
  style.id='atlas-regional-navigation-style';
  style.textContent=`
    .atlas-region-card{margin:10px 12px 12px;padding:12px;border:1px solid rgba(44,189,230,.18);border-radius:14px;background:linear-gradient(145deg,rgba(7,31,49,.8),rgba(3,17,29,.72));display:grid;gap:9px}
    .atlas-region-card>span{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted,#88a1b4)}
    .atlas-region-card select{width:100%;min-width:0}
    .atlas-region-core{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;color:var(--muted,#88a1b4)}
    .atlas-region-core strong{color:#31e5ff;font-weight:600}
    html.light .atlas-region-card{background:rgba(245,252,255,.92)}
  `;
  document.head.appendChild(style);
}

function switcherMarkup(){
  const regionOptions=Object.entries(REGIONS).map(([key,r])=>`<option value="${key}" ${key===context.region?'selected':''}>${r.label}</option>`).join('');
  const countryOptions=REGIONS[context.region].countries.map(([code,name])=>`<option value="${code}" ${code===context.country?'selected':''}>${name}</option>`).join('');
  return `<span>Capa regional ATLAS</span><select id="atlas-region-select" aria-label="Región ATLAS">${regionOptions}</select><select id="atlas-country-select" aria-label="País ATLAS">${countryOptions}</select><div class="atlas-region-core"><span>Mismo núcleo</span><strong>${CORE_ID}</strong></div>`;
}

function renderSwitcher(){
  ensureStyles();
  const sidebar=document.getElementById('sidebar');
  if(!sidebar) return;
  let card=document.getElementById('atlas-region-card');
  if(!card){
    card=document.createElement('div');
    card.id='atlas-region-card';
    card.className='atlas-region-card';
    const anchor=sidebar.querySelector('.workspace-card');
    if(anchor) anchor.insertAdjacentElement('afterend',card);
    else sidebar.prepend(card);
  }
  card.innerHTML=switcherMarkup();
  const regionSelect=card.querySelector('#atlas-region-select');
  const countrySelect=card.querySelector('#atlas-country-select');
  regionSelect.onchange=()=>setRegion(regionSelect.value);
  countrySelect.onchange=()=>setCountry(countrySelect.value);
}

function observeShell(){
  const target=document.body;
  if(!target) return;
  const observer=new MutationObserver(()=>{
    if(document.getElementById('sidebar')&&!document.getElementById('atlas-region-card')) renderSwitcher();
  });
  observer.observe(target,{childList:true,subtree:true});
}

window.ATLASRegionalNavigation={
  version:'1.0.0',
  coreId:CORE_ID,
  regions:REGIONS,
  getContext,
  setContext,
  setRegion,
  setCountry,
  registerRegion
};

document.addEventListener('DOMContentLoaded',()=>{
  renderSwitcher();
  observeShell();
  emit();
});

if(document.readyState!=='loading'){
  renderSwitcher();
  observeShell();
  emit();
}
})();
