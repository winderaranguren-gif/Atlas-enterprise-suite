import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const script = new URL('./source-backup.mjs', import.meta.url);
const sourceSha = '0123456789abcdef0123456789abcdef01234567';

function run(args, expectedStatus = 0) {
  const result = spawnSync(process.execPath, [script.pathname, ...args], { encoding: 'utf8' });
  if (result.status !== expectedStatus) {
    throw new Error(`unexpected_status:${result.status}\nstdout:${result.stdout}\nstderr:${result.stderr}`);
  }
  return result;
}

const root = await mkdtemp(join(tmpdir(), 'atlas-backup-test-'));
const manifest = join(root, '.atlas-backup', 'source-manifest.json');

try {
  await mkdir(join(root, 'modules'));
  await writeFile(join(root, 'README.md'), 'ATLAS\n');
  await writeFile(join(root, 'modules', 'core.js'), 'export const ready = true;\n');

  run(['create', '--root', root, '--manifest', manifest, '--source-sha', sourceSha]);
  run(['verify', '--root', root, '--manifest', manifest]);

  await writeFile(join(root, 'modules', 'core.js'), 'export const ready = false;\n');
  const changed = run(['verify', '--root', root, '--manifest', manifest], 1);
  if (!changed.stderr.includes('checksum_mismatch:modules/core.js')) throw new Error('tamper_not_detected');

  await writeFile(join(root, 'modules', 'core.js'), 'export const ready = true;\n');
  await writeFile(join(root, 'unexpected.txt'), 'unexpected\n');
  const extra = run(['verify', '--root', root, '--manifest', manifest], 1);
  if (!extra.stderr.includes('unexpected_file:unexpected.txt')) throw new Error('extra_file_not_detected');

  await rm(join(root, 'unexpected.txt'));
  await symlink(join(root, 'README.md'), join(root, 'linked-readme'));
  const linked = run(['verify', '--root', root, '--manifest', manifest], 1);
  if (!linked.stderr.includes('symlink_forbidden:linked-readme')) throw new Error('symlink_not_rejected');

  console.log('ATLAS source backup create/verify/tamper/extra/symlink tests passed');
} finally {
  await rm(root, { recursive: true, force: true });
}
