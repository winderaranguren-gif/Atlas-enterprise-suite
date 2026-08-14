/**
 * ATLAS Performance Optimizer
 * Safe-by-default policy engine. It creates plans only; authorized native ATLAS
 * OS adapters execute approved, reversible actions.
 */
const BASE_PROTECTED_KINDS=Object.freeze(['recording','video-call','system','security','backup']);
const REQUIRED_CONFIRMATIONS=Object.freeze(['terminate','delete','security-change']);
const DEFAULT_POLICY=Object.freeze({idleMinutesBeforeSuspend:15,highMemoryMb:750,highCpuPercent:70,protectedKinds:BASE_PROTECTED_KINDS,requireConfirmationFor:REQUIRED_CONFIRMATIONS});
const finiteNumber=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const positiveSetting=(v,f)=>finiteNumber(v,f)>0?finiteNumber(v,f):f;
const canonical=(v)=>String(v||'').trim().toLowerCase();
const safeStringList=(v)=>Array.isArray(v)?v.filter(x=>typeof x==='string'&&x.trim()).map(canonical):[];
function resolvePolicy(policy){const i=policy&&typeof policy==='object'&&!Array.isArray(policy)?policy:{};return{idleMinutesBeforeSuspend:positiveSetting(i.idleMinutesBeforeSuspend,DEFAULT_POLICY.idleMinutesBeforeSuspend),highMemoryMb:positiveSetting(i.highMemoryMb,DEFAULT_POLICY.highMemoryMb),highCpuPercent:Math.min(100,positiveSetting(i.highCpuPercent,DEFAULT_POLICY.highCpuPercent)),protectedKinds:[...new Set([...BASE_PROTECTED_KINDS,...safeStringList(i.protectedKinds)])],requireConfirmationFor:[...new Set([...REQUIRED_CONFIRMATIONS,...safeStringList(i.requireConfirmationFor)])]}}
export function normalizeProcess(process={}){const i=process&&typeof process==='object'?process:{};return{id:String(i.id||'').trim(),name:String(i.name||'Unknown').trim()||'Unknown',kind:canonical(i.kind||'application'),memoryMb:Math.max(0,finiteNumber(i.memoryMb)),cpuPercent:Math.min(100,Math.max(0,finiteNumber(i.cpuPercent))),idleMinutes:Math.max(0,finiteNumber(i.idleMinutes)),protected:Boolean(i.protected),visible:i.visible!==false}}
export function buildOptimizationPlan(processes=[],policy={}){const s=resolvePolicy(policy),protectedKinds=new Set(s.protectedKinds),confirm=new Set(s.requireConfirmationFor),actions=[];let estimatedMemoryMb=0;for(const raw of Array.isArray(processes)?processes:[]){const p=normalizeProcess(raw);if(!p.id)continue;const isProtected=p.protected||protectedKinds.has(p.kind);if(isProtected){actions.push({processId:p.id,processName:p.name,action:'keep',reason:'protected-workload',requiresConfirmation:false});continue}if(p.cpuPercent>=s.highCpuPercent){actions.push({processId:p.id,processName:p.name,action:'notify',reason:'high-cpu',requiresConfirmation:false});continue}if(p.idleMinutes>=s.idleMinutesBeforeSuspend&&p.memoryMb>=s.highMemoryMb){actions.push({processId:p.id,processName:p.name,action:'suspend',reason:'idle-high-memory',requiresConfirmation:confirm.has('suspend'),reversible:true});estimatedMemoryMb+=p.memoryMb}}
return{mode:'safe',generatedAt:new Date().toISOString(),estimatedMemoryMb:Math.round(estimatedMemoryMb),actions,safeguards:{destructiveActionsDisabled:true,confirmationRequiredFor:s.requireConfirmationFor,protectedKinds:s.protectedKinds}}}
export function canExecuteAction(action,confirmation=false){if(!action||typeof action!=='object'||!String(action.processId||'').trim())return false;if(action.action==='delete')return false;if(action.requiresConfirmation===true&&confirmation!==true)return false;if(action.action==='terminate'||action.action==='security-change')return confirmation===true;return['keep','notify','suspend','resume'].includes(action.action)}
export { BASE_PROTECTED_KINDS, DEFAULT_POLICY, REQUIRED_CONFIRMATIONS };
