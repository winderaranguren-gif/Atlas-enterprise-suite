'use strict';

const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const runtime=fs.readFileSync(path.join(root,'atlas-regional-navigation.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const worker=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');

const requiredRegions=[
  'global','northAmerica','centralAmerica','caribbean','southAmerica',
  'europe','africa','asia','oceania','antarctica'
];

for(const region of requiredRegions){
  if(!runtime.includes(`${region}:{`)) throw new Error(`Missing ATLAS region: ${region}`);
}
if(!runtime.includes("const CORE_ID='ATLAS-GLOBAL-CORE'")) throw new Error('ATLAS global core identity missing');
if(!runtime.includes("atlas:region-changed")) throw new Error('ATLAS regional change event missing');
if(!index.includes('atlas-regional-navigation.js?v=1')) throw new Error('Regional runtime is not loaded by index.html');
if(!worker.includes("'/atlas-regional-navigation.js'")) throw new Error('Regional runtime is not cached by the PWA shell');

console.log('ATLAS regional navigation structure validated.');
