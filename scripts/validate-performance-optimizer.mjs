import assert from 'node:assert/strict';
import { BASE_PROTECTED_KINDS, buildOptimizationPlan, canExecuteAction, normalizeProcess } from '../modules/performance-optimizer.js';

const protectedPlan=buildOptimizationPlan([{id:'rec',name:'Recorder',kind:' Recording ',memoryMb:4000,idleMinutes:90}],{protectedKinds:[]});
assert.equal(protectedPlan.actions[0].action,'keep');
assert.deepEqual(protectedPlan.safeguards.protectedKinds.slice(0,BASE_PROTECTED_KINDS.length),BASE_PROTECTED_KINDS);

const suspensionPlan=buildOptimizationPlan([{id:'idle',name:'Idle app',memoryMb:800,idleMinutes:20}],{requireConfirmationFor:['suspend']});
assert.equal(suspensionPlan.actions[0].action,'suspend');
assert.equal(suspensionPlan.actions[0].reversible,true);
assert.equal(suspensionPlan.actions[0].requiresConfirmation,true);
assert.equal(suspensionPlan.estimatedMemoryMb,800);
assert.equal(canExecuteAction(suspensionPlan.actions[0],false),false);
assert.equal(canExecuteAction(suspensionPlan.actions[0],true),true);

const highCpuPlan=buildOptimizationPlan([{id:'cpu',name:'Busy app',cpuPercent:90,memoryMb:900,idleMinutes:90}]);
assert.equal(highCpuPlan.actions[0].action,'notify');
assert.equal(highCpuPlan.estimatedMemoryMb,0);

assert.deepEqual(buildOptimizationPlan([{name:'Missing ID',memoryMb:900,idleMinutes:90}]).actions,[]);
assert.deepEqual(buildOptimizationPlan(null).actions,[]);
assert.equal(normalizeProcess({kind:' BACKUP ',cpuPercent:900}).kind,'backup');
assert.equal(normalizeProcess({cpuPercent:900}).cpuPercent,100);
assert.equal(canExecuteAction({processId:'p',action:'delete'},true),false);
assert.equal(canExecuteAction({processId:'p',action:'terminate'},false),false);
assert.equal(canExecuteAction({processId:'p',action:'terminate'},true),true);
assert.equal(canExecuteAction({action:'suspend'}),false);
assert.equal(canExecuteAction({processId:'p',action:'unknown'}),false);

console.log('ATLAS Performance Optimizer validation passed');
