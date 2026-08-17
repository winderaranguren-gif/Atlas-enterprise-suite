const origin=(process.env.ATLAS_PRODUCTION_ORIGIN||'https://atlasenterprisesuite.com').replace(/\/$/,'');

async function expectRedirect(path,expectedFragment){
  const response=await fetch(origin+path,{redirect:'manual',headers:{'user-agent':'ATLAS-Voice-Production-Verifier/1.0'}});
  if(![301,302,303,307,308].includes(response.status))throw new Error(`voice_production_verification_failed:${path}:expected_redirect_got_${response.status}`);
  const location=response.headers.get('location')||'';
  if(!location.includes(expectedFragment))throw new Error(`voice_production_verification_failed:${path}:unexpected_location:${location}`);
  return {path,status:response.status,location};
}

const canonical=await expectRedirect('/platform/settings/voice','/login');
const alias=await expectRedirect('/voice','/platform/settings/voice');
console.log(JSON.stringify({ok:true,origin,canonical,alias},null,2));
