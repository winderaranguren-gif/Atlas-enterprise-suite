/**
 * ATLAS Performance Optimizer
 *
 * Safe-by-default policy engine. It creates plans only; authorized native ATLAS
 * OS adapters are responsible for executing approved, reversible actions.
 */

const BASE_PROTECTED_KINDS = Object.freeze([
  "recording", "video-call", "system", "security", "backup",
]);

const REQUIRED_CONFIRMATIONS = Object.freeze([
  "terminate", "delete", "security-change",
]);

const DEFAULT_POLICY = Object.freeze({
  idleMinutesBeforeSuspend: 15,
  highMemoryMb: 750,
  highCpuPercent: 70,
  protectedKinds: BASE_PROTECTED_KINDS,
  requireConfirmationFor: REQUIRED_CONFIRMATIONS,
});

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function positiveSetting(value, fallback) {
  const number = finiteNumber(value, fallback);
  return number > 0 ? number : fallback;
}

function safeStringList(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim())
    : [];
}

function resolvePolicy(policy) {
  const input = policy && typeof policy === "object" && !Array.isArray(policy) ? policy : {};
  return {
    idleMinutesBeforeSuspend: positiveSetting(
      input.idleMinutesBeforeSuspend,
      DEFAULT_POLICY.idleMinutesBeforeSuspend,
    ),
    highMemoryMb: positiveSetting(input.highMemoryMb, DEFAULT_POLICY.highMemoryMb),
    highCpuPercent: Math.min(
      100,
      positiveSetting(input.highCpuPercent, DEFAULT_POLICY.highCpuPercent),
    ),
    protectedKinds: [
      ...new Set([...BASE_PROTECTED_KINDS, ...safeStringList(input.protectedKinds)]),
    ],
    requireConfirmationFor: [
      ...new Set([...REQUIRED_CONFIRMATIONS, ...safeStringList(input.requireConfirmationFor)]),
    ],
  };
}

export function normalizeProcess(process = {}) {
  const input = process && typeof process === "object" ? process : {};
  return {
    id: String(input.id || ""),
    name: String(input.name || "Unknown"),
    kind: String(input.kind || "application"),
    memoryMb: Math.max(0, finiteNumber(input.memoryMb)),
    cpuPercent: Math.min(100, Math.max(0, finiteNumber(input.cpuPercent))),
    idleMinutes: Math.max(0, finiteNumber(input.idleMinutes)),
    protected: Boolean(input.protected),
    visible: input.visible !== false,
  };
}

export function buildOptimizationPlan(processes = [], policy = {}) {
  const settings = resolvePolicy(policy);
  const protectedKinds = new Set(settings.protectedKinds);
  const plan = [];
  let estimatedMemoryMb = 0;

  for (const rawProcess of Array.isArray(processes) ? processes : []) {
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
      protectedKinds: settings.protectedKinds,
    },
  };
}

export function canExecuteAction(action, confirmation = false) {
  if (!action || typeof action !== "object") return false;
  if (action.action === "delete") return false;
  if (action.action === "terminate" || action.action === "security-change") {
    return confirmation === true;
  }
  return ["keep", "notify", "suspend", "resume"].includes(action.action);
}

export { BASE_PROTECTED_KINDS, DEFAULT_POLICY, REQUIRED_CONFIRMATIONS };
