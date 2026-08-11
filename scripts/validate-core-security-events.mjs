import fs from 'node:fs';

const core=fs.readFileSync(new URL('../worker/commercial-core.js',import.meta.url),'utf8');
const failures=[];
const requireText=(text,label)=>{if(!core.includes(text)) failures.push(label);};

requireText("async function authorize(request,env,mode='read',resourceType='scope')",'authorize must accept an explicit resourceType classification');
requireText("resourceType,decision:'deny',reason:'invalid_session'",'invalid sessions must retain the module resource type');
requireText("resourceType,decision:'deny',reason:'missing_scope'",'missing scope decisions must retain the module resource type');
requireText("resourceType,decision:'deny',reason:'membership_missing'",'missing membership decisions must retain the module resource type');
requireText("resourceType,decision:'deny',reason:`role_${role}_not_allowed`",'role denials must retain the module resource type');
requireText("resourceType,decision:'allow',reason:`role_${role}`",'allow decisions must retain the module resource type');

requireText("authorize(request,env,'read','crm_scope')",'CRM reads must emit crm_scope security evidence');
requireText("authorize(request,env,'write','crm_scope')",'CRM writes must emit crm_scope security evidence');
requireText("authorize(request,env,'directory','user_scope')",'user directory reads must emit user_scope security evidence');
requireText("authorize(request,env,'manage','user_scope')",'membership management must emit user_scope security evidence');
requireText("authorize(request,env,'audit','audit_scope')",'audit reads must emit audit_scope security evidence');

requireText("WHERE user_id=? AND organization_id=? AND dba_id=? AND status='active'",'authorization must preserve exact active Organization/DBA membership scoping');

if(failures.length){
  console.error('Core security-event validation failed:');
  for(const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Core security-event classification validation passed.');
