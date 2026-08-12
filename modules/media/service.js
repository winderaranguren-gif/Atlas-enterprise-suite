export const SUPPORTED_MEDIA_KINDS = Object.freeze(['music','audio','video']);

function validationError(code, status=400){
  const error=new Error(code);
  error.code=code;
  error.status=status;
  return error;
}

function cleanString(value,maxLength){
  if(value===undefined||value===null) return null;
  const text=String(value).trim();
  if(!text) return null;
  return text.slice(0,maxLength);
}

function boundedNumber(value,{min,max,defaultValue=null}){
  if(value===undefined||value===null||value==='') return defaultValue;
  const number=Number(value);
  if(!Number.isFinite(number)||number<min||number>max) return null;
  return number;
}

export function normalizeGenerationRequest(payload={}){
  if(!payload || typeof payload!=='object' || Array.isArray(payload)){
    throw validationError('media_request_object_required');
  }

  const kind=cleanString(payload.kind,32)?.toLowerCase();
  if(!SUPPORTED_MEDIA_KINDS.includes(kind)){
    throw validationError('unsupported_media_kind');
  }

  const prompt=cleanString(payload.prompt,12000);
  if(!prompt) throw validationError('media_prompt_required');

  const title=cleanString(payload.title,240);
  const style=cleanString(payload.style,1000);
  const language=cleanString(payload.language,32);
  const durationSeconds=boundedNumber(payload.duration_seconds,{min:1,max:3600,defaultValue:null});
  if(payload.duration_seconds!==undefined && durationSeconds===null){
    throw validationError('invalid_media_duration');
  }

  const aspectRatio=cleanString(payload.aspect_ratio,32);
  const outputFormat=cleanString(payload.output_format,32);

  return {
    kind,
    prompt,
    title,
    style,
    language,
    duration_seconds:durationSeconds,
    aspect_ratio:aspectRatio,
    output_format:outputFormat
  };
}

export async function callMediaGenerator(env,request,context={}){
  const binding=env?.MEDIA_GENERATOR;
  if(!binding || typeof binding.fetch!=='function'){
    throw validationError('media_generator_unavailable',503);
  }

  const upstreamRequest=new Request('https://atlas-media.internal/generate',{
    method:'POST',
    headers:{
      'content-type':'application/json',
      'x-atlas-organization':String(context.organizationId||''),
      'x-atlas-dba':String(context.dbaId||''),
      'x-atlas-user':String(context.userId||'')
    },
    body:JSON.stringify(request)
  });

  const response=await binding.fetch(upstreamRequest);
  const text=await response.text();
  let body=null;
  try{ body=text?JSON.parse(text):{}; }catch{ body={raw:text}; }

  if(!response.ok){
    const error=validationError('media_generation_failed',response.status||502);
    error.upstream=body;
    throw error;
  }

  return body;
}
