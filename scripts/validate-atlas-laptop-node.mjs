import fs from 'node:fs';

const compose=fs.readFileSync('infra/laptop/compose.yml','utf8');
const sh=fs.readFileSync('scripts/atlas-laptop-node.sh','utf8');
const ps=fs.readFileSync('scripts/atlas-laptop-node.ps1','utf8');

const required=[
  'container_name: atlas-laptop-01',
  'ATLAS_RUNTIME_PROVIDER: atlas-laptop',
  'ATLAS_NODE_ID: atlas-laptop-01',
  '127.0.0.1:8080:8080',
  'atlas_laptop_state:/var/lib/atlas',
  'read_only: true',
  'no-new-privileges:true',
  'cap_drop:',
  '- ALL',
];
for(const marker of required){if(!compose.includes(marker))throw new Error(`compose missing ${marker}`);}

const portLines=compose.split(/\r?\n/).map(line=>line.trim()).filter(line=>line.startsWith('- "')||line.startsWith("- '"));
for(const line of portLines){
  if(/^-[ ]*["'](?:0\.0\.0\.0:)?(?:80|443):/.test(line))throw new Error(`laptop profile must not expose public web port: ${line}`);
  if(/^-[ ]*["']8080:8080/.test(line))throw new Error(`laptop profile must bind application port to localhost: ${line}`);
}
if(!portLines.some(line=>line.includes('127.0.0.1:8080:8080')))throw new Error('localhost-only application binding missing');

for(const [name,text] of [['bash',sh],['powershell',ps]]){
  if(!text.includes('atlas-laptop-01'))throw new Error(`${name} launcher missing node id`);
  if(!text.includes('127.0.0.1:8080/_atlas/health'))throw new Error(`${name} launcher missing local health gate`);
  if(!text.includes('ghcr.io/winderaranguren-gif/atlas-enterprise-suite'))throw new Error(`${name} launcher missing canonical image guard`);
}
console.log(JSON.stringify({ok:true,service:'ATLAS Laptop Node',node:'atlas-laptop-01',exposure:'localhost-only',persistentState:true,platforms:['Windows','Linux','macOS','WSL2']},null,2));
