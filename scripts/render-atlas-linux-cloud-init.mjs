import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here=dirname(fileURLToPath(import.meta.url));
const templatePath=resolve(here,'../infra/linux-server/cloud-init.yaml');
const args=process.argv.slice(2);

function take(name, fallback=''){
  const index=args.indexOf(`--${name}`);
  if(index===-1)return fallback;
  const value=args[index+1];
  if(!value||value.startsWith('--'))throw new Error(`Missing value for --${name}`);
  return value.trim();
}

const domain=take('domain');
const sshKey=take('ssh-public-key');
const image=take('image','ghcr.io/winderaranguren-gif/atlas-enterprise-suite:latest');
const sshPort=take('ssh-port','22');
const hostname=take('hostname','atlas-linux-server');
const output=take('output','');

if(!/^([A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/.test(domain)){
  throw new Error('A valid --domain is required.');
}
if(/[\r\n]/.test(sshKey)||!(/^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp256) [A-Za-z0-9+/=]+(?: .*)?$/.test(sshKey))){
  throw new Error('A single-line OpenSSH --ssh-public-key is required.');
}
if(!/^ghcr\.io\/winderaranguren-gif\/atlas-enterprise-suite(?::[A-Za-z0-9._-]+|@sha256:[a-f0-9]{64})$/.test(image)){
  throw new Error('Unexpected ATLAS image. Use the canonical GHCR repository.');
}
const port=Number(sshPort);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid --ssh-port.');
if(!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(hostname))throw new Error('Invalid --hostname.');

let rendered=readFileSync(templatePath,'utf8');
const replacements={
  '__ATLAS_DOMAIN__':domain,
  '__ATLAS_SSH_PUBLIC_KEY__':sshKey,
  '__ATLAS_IMAGE__':image,
  '__ATLAS_SSH_PORT__':String(port),
  '__ATLAS_HOSTNAME__':hostname,
};
for(const [needle,value] of Object.entries(replacements))rendered=rendered.split(needle).join(value);
if(/__ATLAS_[A-Z0-9_]+__/.test(rendered))throw new Error('Unresolved ATLAS cloud-init placeholder.');

if(output){
  writeFileSync(resolve(process.cwd(),output),rendered,{mode:0o600});
  console.error(`ATLAS Linux cloud-init written to ${output}`);
}else{
  process.stdout.write(rendered);
}
