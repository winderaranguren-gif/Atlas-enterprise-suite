const isWorkersBuild = process.env.WORKERS_CI === '1';
const branch = String(process.env.WORKERS_CI_BRANCH || '').trim();
const sha = String(process.env.WORKERS_CI_COMMIT_SHA || '').trim();

if (isWorkersBuild) {
  if (!branch) throw new Error('cloudflare_branch_missing');
  if (branch !== 'main') {
    console.error(`ATLAS production guard blocked Cloudflare Workers Build from branch ${branch}${sha ? ` @ ${sha}` : ''}`);
    process.exit(42);
  }
  console.log(`ATLAS production guard accepted main${sha ? ` @ ${sha}` : ''}`);
} else {
  console.log('ATLAS production guard: non-Cloudflare environment, no branch restriction applied');
}
