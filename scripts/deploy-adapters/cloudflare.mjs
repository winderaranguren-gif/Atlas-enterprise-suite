import { spawnSync } from 'node:child_process';

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32', env });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}`);
}

export const id = 'cloudflare';
export const provider = 'Cloudflare Workers';
export const replaceable = true;

export async function preflight() {
  const missing = [];
  if (!process.env.CLOUDFLARE_ACCOUNT_ID) missing.push('CLOUDFLARE_ACCOUNT_ID');
  if (!process.env.CLOUDFLARE_API_TOKEN) missing.push('CLOUDFLARE_API_TOKEN');
  if (missing.length) {
    return { ok: false, reason: 'credentials_missing', missing };
  }
  return { ok: true };
}

export async function deploy() {
  const check = await preflight();
  if (!check.ok) throw new Error(`Cloudflare adapter blocked: missing ${check.missing.join(', ')}`);
  run('npx', ['wrangler', 'deploy']);
  return { ok: true, provider, verified: false };
}

export async function verify() {
  run('npm', ['run', 'verify:production']);
  return { ok: true, provider, verified: true };
}
