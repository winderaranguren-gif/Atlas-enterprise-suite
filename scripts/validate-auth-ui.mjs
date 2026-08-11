import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const fail=(message)=>{console.error(`ATLAS auth UI validation: ${message}`);process.exitCode=1;};
const must=(text,needle,message)=>{if(!text.includes(needle)) fail(message);};
const mustNot=(text,needle,message)=>{if(text.includes(needle)) fail(message);};

const signin=read('public/signin.html');
const app=read('public/app.html');
const auth=read('public/auth-core.js');
const language=read('public/language-core.js');

must(signin,'/auth-core.js','signin must load auth-core.js');
must(signin,'ATLASAuth.login','signin must use the shared authenticated client');
mustNot(signin,"fetch('/api/login'",'legacy /api/login endpoint must not be used');
must(auth,"fetch('/api/auth/login'",'auth client must call /api/auth/login');
must(auth,'session_token','auth client must persist the server session_token field');
must(auth,"api('/api/auth/me',{scoped:false})",'private app verification must call /api/auth/me');
must(auth,"x-atlas-organization",'scoped API calls must send Organization header');
must(auth,"x-atlas-dba",'scoped API calls must send DBA header');
must(auth,"Scope is not assigned to this user",'client scope selection must reject unassigned memberships');
must(auth,"location.replace('/signin.html?reason=session')",'failed private-session verification must redirect to sign in');
must(app,'data-atlas-auth="pending"','private app must start hidden while authentication is pending');
must(app,"html[data-atlas-auth=\"pending\"] body{visibility:hidden}",'private app must fail closed visually before auth verification');
must(app,'/auth-core.js','private app must load auth-core.js');
mustNot(app,'Update Fabric: active','private UI must not claim Update Fabric is active before production verification');
must(app,'Update Fabric: release gated','private UI must show release-gated state');
must(language,"const supported=['en','es']",'language core must support English and Spanish');
must(language,"const defaultLanguage='en'",'English must remain the default language');
must(language,"localStorage.setItem(KEY,language)",'language preference must persist');
must(language,'data-atlas-language','language selector must remain enabled');

if(!process.exitCode) console.log('ATLAS authenticated English-first UI contract is structurally ready.');
