import {handleWorkManagement} from '../modules/work-management-worker.js';
import {handleMobilityCommerce} from '../modules/mobility-commerce-worker.js';
import {handleLaunchQueue} from '../modules/launch-queue-worker.js';

const checks=[
  ['work page',handleWorkManagement,'/work','text/html','ATLAS Work Management'],
  ['work health',handleWorkManagement,'/api/work/health','application/json','atlas-work-management'],
  ['ride page',handleMobilityCommerce,'/ride','text/html','ATLAS Ride'],
  ['driver page',handleMobilityCommerce,'/driver','text/html','ATLAS Driver'],
  ['marketplace page',handleMobilityCommerce,'/marketplace','text/html','ATLAS Marketplace'],
  ['driver finance page',handleMobilityCommerce,'/driver-finance','text/html','ATLAS Driver Finance'],
  ['mobility health',handleMobilityCommerce,'/api/mobility/health','application/json','atlas-mobility-commerce'],
  ['launch queue page',handleLaunchQueue,'/launch-queue','text/html','Launch Queue'],
  ['launch queue health',handleLaunchQueue,'/api/launch-queue/health','application/json','atlas-launch-queue'],
  ['launch queue api',handleLaunchQueue,'/api/launch-queue','application/json','ATLAS Work Management']
];

let failed=0;
for(const [name,handler,path,typeNeedle,bodyNeedle] of checks){
  const request=new Request(`https://atlas.local${path}`);
  const response=await handler(request);
  if(!response){console.error(`FAIL ${name}: handler returned null`);failed++;continue;}
  const type=response.headers.get('content-type')||'';
  const body=await response.text();
  const problems=[];
  if(response.status!==200)problems.push(`status=${response.status}`);
  if(!type.includes(typeNeedle))problems.push(`content-type=${type}`);
  if(!body.includes(bodyNeedle))problems.push(`missing=${bodyNeedle}`);
  if(problems.length){console.error(`FAIL ${name}: ${problems.join(', ')}`);failed++;}
  else console.log(`PASS ${name}`);
}

if(failed){
  console.error(`ATLAS launch validation failed: ${failed} check(s)`);
  process.exit(1);
}
console.log(`ATLAS launch validation passed: ${checks.length} checks`);
