import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root=resolve(new URL('..',import.meta.url).pathname);
const explicitSha=String(process.env.ATLAS_RELEASE_SHA||'').trim();
const providerSha=String(process.env.WORKERS_CI_COMMIT_SHA||process.env.GITHUB_SHA||'').trim();
const explicitBranch=String(process.env.ATLAS_RELEASE_BRANCH||'').trim();
const providerBranch=String(process.env.WORKERS_CI_BRANCH||process.env.GITHUB_REF_NAME||'').trim();
let sha=explicitSha||providerSha;
let branch=explicitBranch||providerBranch||'main';
if(!sha){try{sha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()}catch{}}
if(!/^[0-9a-f]{40}$/i.test(sha))throw new Error('atlas_release_sha_unavailable');
if(branch!=='main')throw new Error(`atlas_release_branch_not_main:${branch}`);
const body=`export const RELEASE_SHA=${JSON.stringify(sha)};\nexport const RELEASE_BRANCH=${JSON.stringify(branch)};\n`;
await writeFile(resolve(root,'modules/release-identity.js'),body,'utf8');
await writeFile(resolve(root,'.atlas-release-sha'),`${sha}\n`,'utf8');
console.log(`ATLAS release stamped ${branch} @ ${sha}${explicitSha?' [sovereign]':''}`);
