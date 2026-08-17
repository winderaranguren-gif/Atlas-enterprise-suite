export const id = 'bundle';
export const provider = 'ATLAS Sovereign Bundle';
export const replaceable = true;

export async function preflight() {
  return { ok: true };
}

export async function deploy(context = {}) {
  return {
    ok: true,
    provider,
    deployed: false,
    bundleReady: true,
    snapshot: context.snapshot || null,
    note: 'Release bundle prepared without publishing to an external provider.',
  };
}

export async function verify() {
  return { ok: true, provider, verified: false, reason: 'bundle_only' };
}
