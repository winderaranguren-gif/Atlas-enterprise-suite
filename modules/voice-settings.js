// Compatibility alias only.
//
// ATLAS Voice is implemented by the canonical Settings module at
// /platform/settings/voice. Keeping the visual/runtime implementation in
// modules/settings.js avoids a second source of truth for preferences,
// permissions, tenant scope, audit logging, navigation and responsive UI.
export async function voiceSettingsRoute(request,env,url){
  if(request.method!=='GET'||url.pathname!=='/voice')return null;
  return new Response(null,{status:302,headers:{
    location:'/platform/settings/voice',
    'cache-control':'no-store'
  }});
}
