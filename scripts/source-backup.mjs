import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

const MANIFEST_VERSION = 1;
const DEFAULT_EXCLUDES = new Set(['.git', 'node_modules', '.atlas-backup']);

function usage() {
  console.error('Usage: node scripts/source-backup.mjs <create|verify> --root <dir> --manifest <file> [--source-sha <40-hex>]');
  process.exit(2);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (!['create', 'verify'].includes(command)) usage();
  const args = { command, root: '.', manifest: '.atlas-backup/source-manifest.json', sourceSha: null };
  for (let index = 0; index < rest.length; index += 2) {
    const key = rest[index];
    const value = rest[index + 1];
    if (!value) usage();
    if (key === '--root') args.root = value;
    else if (key === '--manifest') args.manifest = value;
    else if (key === '--source-sha') args.sourceSha = value;
    else usage();
  }
  return args;
}

function portablePath(path) {
  return path.split(sep).join('/');
}

function isExcluded(path, manifestPath) {
  if (path === manifestPath) return true;
  return path.split('/').some((part) => DEFAULT_EXCLUDES.has(part));
}

async function inventory(root, manifestPath) {
  const entries = [];
  async function walk(directory) {
    const children = await readdir(directory, { withFileTypes: true });
    children.sort((left, right) => left.name.localeCompare(right.name));
    for (const child of children) {
      const absolute = resolve(directory, child.name);
      const path = portablePath(relative(root, absolute));
      if (isExcluded(path, manifestPath)) continue;
      const metadata = await lstat(absolute);
      if (metadata.isSymbolicLink()) throw new Error(`symlink_forbidden:${path}`);
      if (metadata.isDirectory()) await walk(absolute);
      else if (metadata.isFile()) {
        const content = await readFile(absolute);
        entries.push({ path, bytes: content.byteLength, sha256: createHash('sha256').update(content).digest('hex') });
      } else throw new Error(`unsupported_entry:${path}`);
    }
  }
  await walk(root);
  return entries;
}

async function createManifest(args) {
  if (!/^[a-f0-9]{40}$/i.test(args.sourceSha || '')) throw new Error('source_sha_required');
  const root = resolve(args.root);
  const manifestAbsolute = resolve(args.manifest);
  const manifestPath = portablePath(relative(root, manifestAbsolute));
  if (manifestPath.startsWith('../') || manifestPath === '..') throw new Error('manifest_must_be_inside_root');
  const files = await inventory(root, manifestPath);
  const manifest = {
    schema: 'atlas.source-backup-manifest',
    version: MANIFEST_VERSION,
    algorithm: 'sha256',
    sourceCommit: args.sourceSha.toLowerCase(),
    fileCount: files.length,
    files
  };
  await mkdir(dirname(manifestAbsolute), { recursive: true });
  await writeFile(manifestAbsolute, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'w' });
  console.log(`ATLAS source backup manifest created: ${files.length} files @ ${manifest.sourceCommit}`);
}

async function verifyManifest(args) {
  const root = resolve(args.root);
  const manifestAbsolute = resolve(args.manifest);
  const manifestPath = portablePath(relative(root, manifestAbsolute));
  const manifest = JSON.parse(await readFile(manifestAbsolute, 'utf8'));
  if (manifest.schema !== 'atlas.source-backup-manifest' || manifest.version !== MANIFEST_VERSION) throw new Error('unsupported_manifest');
  if (manifest.algorithm !== 'sha256' || !/^[a-f0-9]{40}$/.test(manifest.sourceCommit || '')) throw new Error('invalid_manifest_identity');
  if (!Array.isArray(manifest.files) || manifest.fileCount !== manifest.files.length) throw new Error('invalid_manifest_file_count');
  const actual = await inventory(root, manifestPath);
  const expectedByPath = new Map(manifest.files.map((entry) => [entry.path, entry]));
  const actualByPath = new Map(actual.map((entry) => [entry.path, entry]));
  for (const [path, expected] of expectedByPath) {
    const found = actualByPath.get(path);
    if (!found) throw new Error(`missing_file:${path}`);
    if (found.bytes !== expected.bytes || found.sha256 !== expected.sha256) throw new Error(`checksum_mismatch:${path}`);
  }
  for (const path of actualByPath.keys()) if (!expectedByPath.has(path)) throw new Error(`unexpected_file:${path}`);
  console.log(`ATLAS source backup verified: ${actual.length} files @ ${manifest.sourceCommit}`);
}

const args = parseArgs(process.argv.slice(2));
try {
  if (args.command === 'create') await createManifest(args);
  else await verifyManifest(args);
} catch (error) {
  console.error(`ATLAS source backup ${args.command} failed: ${error.message}`);
  process.exit(1);
}
