import { spawn } from 'node:child_process';
const services=[['runtime','atlas/runtime.mjs'],['control','atlas/control-plane.mjs']];
const children=new Map();let stopping=false;
function start(name,file){const child=spawn(process.execPath,[file],{env:{...process.env,ATLAS_NODE_ID:process.env.ATLAS_NODE_ID||'ATLAS-NODE-01'},stdio:'inherit'});children.set(name,child);child.on('exit',(code,signal)=>{children.delete(name);if(!stopping){console.error(`[ATLAS Supervisor] ${name} exited (${code??signal}); restarting`);setTimeout(()=>start(name,file),1000)}})}
for(const s of services)start(...s);
function stop(){stopping=true;for(const child of children.values())child.kill('SIGTERM');setTimeout(()=>process.exit(0),700).unref()}
process.on('SIGINT',stop);process.on('SIGTERM',stop);console.log('[ATLAS Supervisor] Node services started');
