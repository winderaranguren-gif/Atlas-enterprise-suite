import fs from 'node:fs';

const fail = (message) => {
  console.error(`ATLAS Documents validation failed: ${message}`);
  process.exitCode = 1;
};
const need = (text, marker, label) => {
  if (!text.includes(marker)) fail(`${label} missing ${marker}`);
};

const migration = fs.readFileSync(new URL('../migrations/0012_documents.sql', import.meta.url),'utf8');
const documents = fs.readFileSync(new URL('../worker/documents.js', import.meta.url),'utf8');
const router = fs.readFileSync(new URL('../worker/router.js', import.meta.url),'utf8');
const wrangler = fs.readFileSync(new URL('../wrangler.jsonc', import.meta.url),'utf8');

for (const marker of [
  'CREATE TABLE IF NOT EXISTS atlas_documents',
  'CREATE TABLE IF NOT EXISTS atlas_document_versions',
  'organization_id TEXT NOT NULL',
  'dba_id TEXT NOT NULL',
  'current_version INTEGER NOT NULL',
  'current_hash TEXT NOT NULL',
  'UNIQUE(document_id,version)',
  'ON DELETE RESTRICT'
]) need(migration,marker,'documents migration');

for (const marker of [
  "READ_ROLES=new Set(['owner','admin','editor','viewer','auditor'])",
  "WRITE_ROLES=new Set(['owner','admin','editor'])",
  'MAX_DOCUMENT_BYTES=1024*1024',
  "request.headers.get('x-atlas-organization')",
  "request.headers.get('x-atlas-dba')",
  'atlas_memberships',
  "crypto.subtle.digest('SHA-256'",
  'env.DB.batch([',
  "status='archived'",
  "resource_type:'document'",
  "'/api/documents/health'"
]) need(documents,marker,'documents worker');

for (const marker of [
  "import { handleDocuments } from './documents.js'",
  "url.pathname.startsWith('/api/documents')",
  'return core.fetch(request,env,ctx)'
]) need(router,marker,'worker router');

need(wrangler,'"main": "worker/router.js"','wrangler.jsonc');

if (/organization_id\s*=\s*["'][^"']+["']/.test(documents)) fail('hard-coded organization scope detected');
if (/dba_id\s*=\s*["'][^"']+["']/.test(documents)) fail('hard-coded DBA scope detected');

if (!process.exitCode) console.log('ATLAS Documents validation passed: scoped D1 versioning, SHA-256 integrity, RBAC, audit and modular routing are present.');
