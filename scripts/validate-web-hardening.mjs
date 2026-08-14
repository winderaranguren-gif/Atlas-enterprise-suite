import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const hardening=await readFile('modules/web-hardening.js','utf8');
const worker=await readFile('worker.js','utf8');

assert.ok(hardening.includes("DELETE FROM web_rate_limits WHERE scope=? AND bucket<?"),'rate_limit_cleanup_must_be_scope_specific');
assert.ok(hardening.includes('request.body.getReader()'),'body_stream_limit_missing');
assert.ok(hardening.includes('MAX_BODY_BYTES=20_000'),'body_limit_constant_missing');
assert.ok(hardening.includes("status:413,error:'request_too_large'"),'body_limit_response_missing');
for(const id of ['atlas-login-email','atlas-login-password','atlas-contact-name','atlas-contact-company','atlas-contact-email','atlas-contact-interest','atlas-contact-message']){
  assert.ok(hardening.includes(`for=\"${id}\"`),`missing_label_for:${id}`);
  assert.ok(hardening.includes(`id=\"${id}\"`),`missing_control_id:${id}`);
}
assert.ok(worker.includes("import { webHardeningRoutes } from './modules/web-hardening.js'"),'hardening_import_missing');
assert.ok(worker.indexOf('webHardeningRoutes(request, env, url)')<worker.indexOf('webShellRoutes(request, env, url)'),'hardening_must_run_before_web_shell');
console.log('ATLAS web hardening validation passed');
