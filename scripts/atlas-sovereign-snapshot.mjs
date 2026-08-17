import { createHash } from 'node:crypto';
import { cp, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_ROOT = path.resolve(process.env.ATLAS_SOVEREIGN_DIR || path.join(ROOT, '.atlas', 'sovereign'));
const EXCLUDED = new Set(['.git', 'node_modules', '.atlas', '.DS_Store']);

function releaseId() {
  const now = new Date().toISOString().replace(/[:.]/g, '-');
  return process.env.ATLAS_RELEASE_ID || `atlas-${now}`;
}

async function walk(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (EXCLUDED.has(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    const relative = path.relative(base, absolute).replaceAll(path.sep, '/');
    if (entry.isDirectory()) files.push(...await walk(absolute, base));
    else if (entry.isFile()) files.push({ absolute, relative });
  }
  return files;
}

async function sha256(file) {
  const content = await readFile(file);
  return createHash('sha256').update(content).digest('hex');
}

const id = releaseId();
const releaseDir = path.join(OUT_ROOT, 'snapshots', id);
const sourceDir = path.join(releaseDir, 'source');
await mkdir(sourceDir, { recursive: true });

const files = await walk(ROOT);
const manifestFiles = [];
for (const file of files) {
  const destination = path.join(sourceDir, file.relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(file.absolute, destination);
  const info = await stat(file.absolute);
  manifestFiles.push({ path: file.relative, bytes: info.size, sha256: await sha256(file.absolute) });
}
manifestFiles.sort((a, b) => a.path.localeCompare(b.path));

const aggregate = createHash('sha256');
for (const file of manifestFiles) aggregate.update(`${file.sha256}  ${file.path}\n`);
const manifest = {
  schema: 'atlas.sovereign.snapshot.v1',
  releaseId: id,
  createdAt: new Date().toISOString(),
  sourceRoot: '.',
  providerIndependent: true,
  githubRequired: false,
  fileCount: manifestFiles.length,
  aggregateSha256: aggregate.digest('hex'),
  files: manifestFiles,
};
await writeFile(path.join(releaseDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
await writeFile(path.join(releaseDir, 'README.txt'), `ATLAS Sovereign Snapshot\nRelease: ${id}\nFiles: ${manifest.fileCount}\nSHA-256: ${manifest.aggregateSha256}\n\nThis snapshot is self-contained source evidence and does not require GitHub to exist.\n`);
console.log(JSON.stringify({ ok: true, releaseId: id, releaseDir, fileCount: manifest.fileCount, aggregateSha256: manifest.aggregateSha256 }));