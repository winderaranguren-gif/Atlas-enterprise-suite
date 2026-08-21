const ISO_COUNTRIES = `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW`.split(' ');

const REGION_GROUPS = {
  africa: `DZ AO BJ BW BF BI CV CM CF TD KM CG CD CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU MA MZ NA NE NG RW ST SN SC SL SO ZA SS SD TZ TG TN UG EH ZM ZW RE YT SH`.split(' '),
  asia: `AF AM AZ BD BT BN KH CN GE HK IN ID JP KZ KP KR KG LA MO MY MV MN MM NP PK PH SG LK TW TJ TH TL TM UZ VN`.split(' '),
  europe: `AX AL AD AT BY BE BA BG HR CY CZ DK EE FO FI FR DE GI GR GG VA HU IS IE IM IT JE LV LI LT LU MT MD MC ME NL MK NO PL PT RO RU SM RS SK SI ES SJ SE CH TR UA GB`.split(' '),
  latin_america_caribbean: `AI AG AR AW BS BB BZ BO BQ BR VG KY CL CO CR CU CW DM DO EC SV FK GF GD GP GT GY HT HN JM MQ MX MS NI PA PY PE PR BL KN LC MF VC SX SR TT TC UY VE VI`.split(' '),
  middle_east: `AE BH IR IQ IL JO KW LB OM PS QA SA SY YE`.split(' '),
  north_america: `BM CA GL PM US`.split(' '),
  oceania: `AS AU CC CK CX FJ PF GU HM KI MH FM NR NC NZ NU NF MP PW PG PN WS SB TK TO TV UM VU WF`.split(' ')
};

const COUNTRY_REGION = new Map(Object.entries(REGION_GROUPS).flatMap(([region,codes])=>codes.map(code=>[code,region])));
const DEFAULTS = {
  africa:{locale:'en',currency:'USD'}, asia:{locale:'en',currency:'USD'}, europe:{locale:'en-GB',currency:'EUR'},
  latin_america_caribbean:{locale:'es',currency:'USD'}, middle_east:{locale:'ar',currency:'USD'},
  north_america:{locale:'en',currency:'USD'}, oceania:{locale:'en',currency:'USD'}, other:{locale:'en',currency:'USD'}
};
const OVERRIDES = {
  US:['en-US','USD'],CA:['en-CA','CAD'],MX:['es-MX','MXN'],BR:['pt-BR','BRL'],AR:['es-AR','ARS'],CO:['es-CO','COP'],CL:['es-CL','CLP'],PE:['es-PE','PEN'],VE:['es-VE','VES'],
  GB:['en-GB','GBP'],CH:['de-CH','CHF'],NO:['nb-NO','NOK'],SE:['sv-SE','SEK'],DK:['da-DK','DKK'],PL:['pl-PL','PLN'],CZ:['cs-CZ','CZK'],HU:['hu-HU','HUF'],RO:['ro-RO','RON'],UA:['uk-UA','UAH'],TR:['tr-TR','TRY'],
  JP:['ja-JP','JPY'],CN:['zh-CN','CNY'],HK:['zh-HK','HKD'],TW:['zh-TW','TWD'],KR:['ko-KR','KRW'],IN:['en-IN','INR'],ID:['id-ID','IDR'],MY:['ms-MY','MYR'],PH:['en-PH','PHP'],SG:['en-SG','SGD'],TH:['th-TH','THB'],VN:['vi-VN','VND'],PK:['ur-PK','PKR'],BD:['bn-BD','BDT'],
  AE:['ar-AE','AED'],SA:['ar-SA','SAR'],QA:['ar-QA','QAR'],KW:['ar-KW','KWD'],BH:['ar-BH','BHD'],OM:['ar-OM','OMR'],IL:['he-IL','ILS'],JO:['ar-JO','JOD'],EG:['ar-EG','EGP'],ZA:['en-ZA','ZAR'],NG:['en-NG','NGN'],KE:['en-KE','KES'],GH:['en-GH','GHS'],MA:['ar-MA','MAD'],
  AU:['en-AU','AUD'],NZ:['en-NZ','NZD']
};

function profile(code,language){
  const normalized=String(code||'XX').toUpperCase();
  const region=COUNTRY_REGION.get(normalized)||'other';
  const [locale,currency]=OVERRIDES[normalized]||[DEFAULTS[region].locale,DEFAULTS[region].currency];
  let name=normalized;
  try{name=new Intl.DisplayNames([language||locale,'en'],{type:'region'}).of(normalized)||normalized;}catch{}
  return {code:normalized,name,region,locale,currency,route:`/global/${normalized.toLowerCase()}`,localization:'available',compliance:'requires-validation'};
}

function json(value,status=200){return Response.json(value,{status,headers:{'cache-control':'public, max-age=3600','access-control-allow-origin':'*'}});}

function page(country){
  const title=country.code==='XX'?'ATLAS Global':`ATLAS ${country.name}`;
  return new Response(`<!doctype html><html lang="${country.locale}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{margin:0;background:#06111f;color:#eaf5ff;font:16px system-ui}.shell{max-width:1050px;margin:auto;padding:48px 22px}.tag{color:#67d5ff;text-transform:uppercase;letter-spacing:.12em}.card{margin-top:24px;padding:28px;border:1px solid #234766;border-radius:20px;background:#0b1c2dcc}a{color:#79dcff}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}.item{padding:18px;border-radius:14px;background:#10283d}</style><main class="shell"><a href="/dashboard">← ATLAS</a><p class="tag">ATLAS Global Country Edition</p><h1>${title}</h1><p>Experiencia localizada mediante Cloudflare Edge. La configuración legal, fiscal y de pagos permanece desactivada hasta validación para ${country.name}.</p><section class="card grid"><div class="item"><b>País</b><p>${country.name} (${country.code})</p></div><div class="item"><b>Región</b><p>${country.region}</p></div><div class="item"><b>Idioma base</b><p>${country.locale}</p></div><div class="item"><b>Moneda base</b><p>${country.currency}</p></div><div class="item"><b>Localización</b><p>Disponible</p></div><div class="item"><b>Cumplimiento</b><p>Requiere validación</p></div></section></main></html>`,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=900'}});
}

export function handleGlobalCountry(request){
  const url=new URL(request.url); const path=url.pathname;
  const detected=String(request.cf?.country||request.headers.get('cf-ipcountry')||'XX').toUpperCase();
  const language=(request.headers.get('accept-language')||'en').split(',')[0];
  if(path==='/api/global/context')return json({ok:true,detected:profile(detected,language),timezone:request.cf?.timezone||null,city:request.cf?.city||null,colo:request.cf?.colo||null});
  if(path==='/api/global/countries')return json({ok:true,count:ISO_COUNTRIES.length,countries:ISO_COUNTRIES.map(code=>profile(code,language))});
  if(path==='/global')return page(profile(detected,language));
  const match=path.match(/^\/global\/([a-z]{2})\/?$/i);
  if(match){const code=match[1].toUpperCase();if(!ISO_COUNTRIES.includes(code))return json({ok:false,error:'Unsupported ISO 3166-1 alpha-2 code'},404);return page(profile(code,language));}
  return null;
}

export {ISO_COUNTRIES, REGION_GROUPS};
