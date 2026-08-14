/**
 * ATLAS Performance Optimizer
 *
 * Safe-by-default policy engine for ATLAS OS. This module analyzes normalized
 * process metrics and returns an optimization plan. Native OS adapters are
 * responsible for executing approved actions.
 */

const DEFAULT_POLICY = Object.freeze({
  idleMinutesBeforeSuspend: 15,
  highMemoryMb: 750,
  highCpuPercent: 70,
  protectedKinds: ["recording", "video-call", "system", "security", "backup"],
  requireConfirmationFor: ["terminate", "delete", "security-change"],
});

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function normalizeProcess(process = {}) {
  return {
    id: String(process.id || ""),
    name: String(process.name || "Unknown"),
    kind: String(process.kind || "application"),
    memoryMb: Math.max(0, finiteNumber(process.memoryMb)),
    cpuPercent: Math.max(0, finiteNumber(process.cpuPercent)),
    idleMinutes: Math.max(0, finiteNumber(process.idleMinutes)),
    protected: Boolean(process.protected),
    visible: process.visible !== false,
  };
}

export function buildOptimizationPlan(processes = [], policy = {}) {
  const settings = { ...DEFAULT_POLICY, ...policy };
  const protectedKinds = new Set(settings.protectedKinds);
  const plan = [];
  let estimatedMemoryMb = 0;

  for (const rawProcess of processes) {
    const process = normalizeProcess(rawProcess);
    const isProtected = process.protected || protectedKinds.has(process.kind);

    if (isProtected) {
      plan.push({
        processId: process.id,
        processName: process.name,
        action: "keep",
        reason: "protected-workload",
        requiresConfirmation: false,
      });
      continue;
    }

    if (
      process.idleMinutes >= settings.idleMinutesBeforeSuspend &&
      process.memoryMb >= settings.highMemoryMb
    ) {
      plan.push({
        processId: process.id,
        processName: process.name,
        action: "suspend",
        reason: "idle-high-memory",
        requiresConfirmation: false,
        reversible: true,
      });
      estimatedMemoryMb += process.memoryMb;
      continue;
    }

    if (process.cpuPercent >= settings.highCpuPercent) {
      plan.push({
        processId: process.id,
        processName: process.name,
        action: "notify",
        reason: "high-cpu",
        requiresConfirmation: false,
      });
    }
  }

  return {
    mode: "safe",
    generatedAt: new Date().toISOString(),
    estimatedMemoryMb: Math.round(estimatedMemoryMb),
    actions: plan,
    safeguards: {
      destructiveActionsDisabled: true,
      confirmationRequiredFor: settings.requireConfirmationFor,
      protectedKinds: [...protectedKinds],
    },
  };
}

export function canExecuteAction(action, confirmation = false) {
  if (!action || action.action === "delete") return false;
  if (action.action === "terminate" || action.action === "security-change") {
    return confirmation === true;
  }
  return ["keep", "notify", "suspend", "resume"].includes(action.action);
}

export { DEFAULT_POLICY };
