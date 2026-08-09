'use strict';

const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const failures=[];
const pass=(condition,message)=>{if(!condition)failures.push(message);};

const required=['cloudflare/gps-gateway.js','cloudflare/worker-entry.js','atlas-gps-cloud-provider.js','atlas-gps-4d.html','wrangler.jsonc'];
for(const file of required)pass(fs.existsSync(path.join(root,file)),`Missing GPS provider-gateway file: ${file}`);

if(!failures.length){
  const gateway=read('cloudflare/gps-gateway.js');
  const entry=read('cloudflare/worker-entry.js');
  const browser=read('atlas-gps-cloud-provider.js');
  const html=read('atlas-gps-4d.html');
  const wrangler=read('wrangler.jsonc');

  pass(wrangler.includes('"main": "cloudflare/worker-entry.js"'),'Wrangler must use the layered worker entry.');
  pass(entry.includes("import baseWorker from './worker.js'"),'GPS worker entry must delegate existing ATLAS behavior.');
  pass(entry.includes("url.pathname.startsWith('/api/gps/')"),'Worker entry must scope interception to /api/gps/.');
  pass(gateway.includes('env.ATLAS_GPS_SEARCH_URL')&&gateway.includes('env.ATLAS_GPS_ROUTER_URL'),'GPS upstreams must come from server environment bindings.');
  pass(gateway.includes("url.protocol==='https:'"),'Configured GPS upstreams must require HTTPS.');
  pass(!gateway.includes('body.baseUrl')&&!gateway.includes('url.searchParams.get(\'baseUrl\')'),'Client input must not choose GPS upstream URLs.');
  pass(gateway.includes('MAX_UPSTREAM_BYTES')&&gateway.includes('MAX_ROUTE_POINTS'),'Gateway must bound upstream payloads and route geometry.');
  pass(browser.includes("const STATUS_URL='/api/gps/status'")&&browser.includes("const SEARCH_URL='/api/gps/search'")&&browser.includes("const ROUTE_URL='/api/gps/route'"),'Browser provider must use same-origin ATLAS GPS endpoints.');
  pass(!/https?:\/\//i.test(browser),'Browser provider must not embed external provider URLs.');
  pass(html.includes('atlas-gps-cloud-provider.js'),'GPS page must load the optional same-origin provider adapter.');
}

if(failures.length){
  console.error('ATLAS GPS provider-gateway validation failed:');
  failures.forEach(failure=>console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`ATLAS GPS provider-gateway validation passed (${required.length} required files, same-origin/server-config gates enforced).`);
