import assert from "node:assert/strict";
import {
  BASE_PROTECTED_KINDS,
  buildOptimizationPlan,
  canExecuteAction,
  normalizeProcess,
} from "../modules/performance-optimizer.js";

const protectedPlan = buildOptimizationPlan([
  { id: "rec", name: "Recorder", kind: "recording", memoryMb: 4000, idleMinutes: 90 },
], { protectedKinds: [] });
assert.equal(protectedPlan.actions[0].action, "keep");
assert.deepEqual(
  protectedPlan.safeguards.protectedKinds.slice(0, BASE_PROTECTED_KINDS.length),
  BASE_PROTECTED_KINDS,
);

const suspensionPlan = buildOptimizationPlan([
  { id: "idle", name: "Idle app", memoryMb: 800, idleMinutes: 20 },
]);
assert.equal(suspensionPlan.actions[0].action, "suspend");
assert.equal(suspensionPlan.actions[0].reversible, true);
assert.equal(suspensionPlan.estimatedMemoryMb, 800);

const highCpuPlan = buildOptimizationPlan([
  { id: "cpu", name: "Busy app", cpuPercent: 90, memoryMb: 100, idleMinutes: 0 },
]);
assert.equal(highCpuPlan.actions[0].action, "notify");

assert.deepEqual(buildOptimizationPlan(null).actions, []);
assert.equal(normalizeProcess({ cpuPercent: 900 }).cpuPercent, 100);
assert.equal(canExecuteAction({ action: "delete" }, true), false);
assert.equal(canExecuteAction({ action: "terminate" }, false), false);
assert.equal(canExecuteAction({ action: "terminate" }, true), true);
assert.equal(canExecuteAction({ action: "suspend" }), true);
assert.equal(canExecuteAction({ action: "unknown" }), false);

console.log("ATLAS Performance Optimizer validation passed");
