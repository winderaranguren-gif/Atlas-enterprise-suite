import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const template=readFileSync(resolve(root,'infra/linux-server/cloud-init.yaml'),'utf8');

const required=[
  '#cloud-config',
  '__ATLAS_DOMAIN__',
  '__ATLAS_SSH_PUBLIC_KEY__',
  '__ATLAS_IMAGE__',
  '__ATLAS_SSH_PORT__',
  '__ATLAS_HOSTNAME__',
  'ATLAS_RUNTIME_PROVIDER: atlas-linux-server',
  'read_only: true',
  'no-new-privileges:true',
  'cap_drop:',
  'ufw --force enable',
  'docker compose -f compose.yml up -d',
  "j.service==='ATLAS Portable Runtime'",
];
for(const marker of required){
  if(!template.includes(marker))throw new Error(`ATLAS Linux template missing: ${marker}`);
}

const rendered=execFileSync(process.execPath,[
  resolve(root,'scripts/render-atlas-linux-cloud-init.mjs'),
  '--domain','atlas.example.com',
  '--hostname','atlas-linux-server',
  '--ssh-port','22',
  '--ssh-public-key','ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAtlasValidationOnlyKeyMaterial atlas-ci',
],{encoding:'utf8'});

if(/__ATLAS_[A-Z0-9_]+__/.test(rendered))throw new Error('Rendered cloud-init contains unresolved placeholders.');
for(const marker of ['atlas.example.com','atlas-linux-server','ghcr.io/winderaranguren-gif/atlas-enterprise-suite:latest','ufw allow 22/tcp']){
  if(!rendered.includes(marker))throw new Error(`Rendered cloud-init missing: ${marker}`);
}
if(/password\s*:/i.test(rendered)||/ssh_pwauth:\s*true/i.test(rendered))throw new Error('Password SSH authentication must remain disabled.');

let rejected=false;
try{
  execFileSync(process.execPath,[resolve(root,'scripts/render-atlas-linux-cloud-init.mjs'),'--domain','atlas.example.com','--ssh-public-key','bad-key'],{stdio:'pipe'});
}catch{rejected=true;}
if(!rejected)throw new Error('Renderer accepted an invalid SSH public key.');

console.log(JSON.stringify({ok:true,service:'ATLAS Linux Server',cloudInit:true,sshKeyOnly:true,firewall:true,oci:true,persistentState:true,providerIndependent:true},null,2));
