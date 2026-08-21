const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const SAFE_METHODS=new Set(['GET','HEAD','OPTIONS']);
const TOKEN_REF=/^[A-Za-z0-9._:-]{8,500}$/;
const RAW_CARD_KEYS=new Set(['pan','cardnumber','card_number','cvv','cvc','securitycode','security_code','track1','track2','magstripe']);

const json=(body,status)=>new Response(JSON.stringify(body),{status,headers:JSON_HEADERS});
const bearer=request=>/^Bearer\s+\S+$/i.test(request.headers.get('authorization')||'');

function containsRawCardData(value){
  if(!value||typeof value!=='object')return false;
  if(Array.isArray(value))return value.some(containsRawCardData);
  for(const [key,item] of Object.entries(value)){
    if(RAW_CARD_KEYS.has(String(key).toLowerCase())&&String(item??'').trim())return true;
    if(item&&typeof item==='object'&&containsRawCardData(item))return true;
  }
  return false;
}

function validTokenReference(value){
  const ref=String(value??'').trim();
  if(!TOKEN_REF.test(ref))return false;
  if(/^\d{12,19}$/.test(ref))return false;
  return true;
}

function originAllowed(request,url){
  if(SAFE_METHODS.has(request.method))return true;
  if(bearer(request))return true;
  const origin=request.headers.get('origin');
  if(!origin)return false;
  try{return new URL(origin).origin===url.origin;}catch{return false;}
}

export async function handleWalletRequestSecurity(request){
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/wallet/')||SAFE_METHODS.has(request.method))return null;
  if(!originAllowed(request,url))return json({ok:false,error:'wallet_same_origin_write_required'},403);

  const contentType=request.headers.get('content-type')||'';
  if(!contentType.includes('application/json'))return null;
  const body=await request.clone().json().catch(()=>null);
  if(!body)return null;
  if(containsRawCardData(body))return json({ok:false,error:'raw_card_data_prohibited_use_provider_tokenization'},400);

  if(url.pathname==='/api/wallet/payment-methods'&&request.method==='POST'){
    if(!validTokenReference(body.paymentMethodRef))return json({ok:false,error:'invalid_tokenized_payment_reference'},400);
  }
  if(url.pathname==='/api/wallet/checkout/square'&&request.method==='POST'){
    if(!validTokenReference(body.sourceToken))return json({ok:false,error:'invalid_square_source_token'},400);
  }
  return null;
}

export const walletRequestSecurity={validTokenReference,containsRawCardData};
