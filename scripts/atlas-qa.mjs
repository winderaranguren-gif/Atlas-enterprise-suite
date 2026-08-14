import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const startedAt = new Date().toISOString();
const major = Number(process.versions.node.split('.')[0]);
if (!Number.isInteger(major) || major < 22) {
  throw new Error(`atlas_qa_requires_node_22_or_newer:current=${process.versions.node}`);
}

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
  if (pkg[field] && Object.keys(pkg[field]).length > 0) {
    throw new Error(`third_party_runtime_dependency_forbidden:${field}`);
  }
}
if (!pkg.scripts?.['build:prod']) throw new Error('missing_build_prod_script');

const syntaxTargets = [
  'worker.js',
  'worker-crm.js',
  'scripts/validate.mjs',
  'scripts/validate-crm.mjs'
];
for (const target of syntaxTargets) {
  const checked = spawnSync(process.execPath, ['--check', target], { stdio: 'inherit' });
  if (checked.status !== 0) throw new Error(`syntax_check_failed:${target}`);
}

const build = spawnSync('npm', ['run', 'build:prod'], {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});
if (build.status !== 0) throw new Error(`production_validation_failed:exit=${build.status}`);

const report = {
  ok: true,
  gate: 'ATLAS QA',
  version: pkg.version,
  node: process.versions.node,
  dependencyPolicy: 'native-only',
  command: 'npm run build:prod',
  startedAt,
  completedAt: new Date().toISOString()
};
console.log(JSON.stringify(report, null, 2));
