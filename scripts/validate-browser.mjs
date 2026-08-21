import assert from 'node:assert/strict';
import {handleBrowser} from '../modules/browser-worker.js';

async function text(path){
  const response=handleBrowser(new Request(`https://atlasenterprisesuite.com${path}`),{},{});
  assert(response instanceof Response,`${path} should return a Response`);
  assert.equal(response.status,200,`${path} should return HTTP 200`);
  return response.text();
}

const workspace=await text('/browser');
assert.match(workspace,/ATLAS Browser/);
assert.match(workspace,/Accounting Context/);
assert.match(workspace,/Open externally/);
assert.match(workspace,/No credentials stored/);
assert.doesNotMatch(workspace,/<iframe\b/i,'Browser workspace must not fake arbitrary third-party iframe browsing');
assert.doesNotMatch(workspace,/type=["']password["']/i,'Browser workspace must not request banking passwords');

const evidence=await text('/browser/evidence');
assert.match(evidence,/Evidence Inbox/);
assert.match(evidence,/localStorage-only|Local browser records only|Local prototype/i);

const settings=await text('/browser/settings');
assert.match(settings,/Browser Settings/);
assert.match(settings,/Clear local browsing data/);
assert.match(settings,/iOS Default Browser Readiness/);

const readiness=await text('/browser/ios-readiness');
assert.match(readiness,/Swift \/ SwiftUI/);
assert.match(readiness,/WKWebView/);
assert.match(readiness,/Keychain/);
assert.match(readiness,/default-browser entitlement/i);
assert.match(readiness,/Never collect or store bank passwords/i);

const architecture=await text('/browser/architecture');
assert.match(architecture,/Three-layer boundary/);
assert.match(architecture,/Native iOS shell/);
assert.match(architecture,/secure services/);

const status=handleBrowser(new Request('https://atlasenterprisesuite.com/api/browser/status'),{},{});
assert(status instanceof Response);
assert.equal(status.status,200);
const payload=await status.json();
assert.equal(payload.ok,true);
assert.equal(payload.mode,'web-workspace');
assert.equal(payload.native_default_browser,false);
assert.equal(payload.credentials,'never-collected');

const unknown=handleBrowser(new Request('https://atlasenterprisesuite.com/browser/not-a-route'),{},{});
assert.equal(unknown,null,'Unknown Browser route should fall through to the main router');

console.log('ATLAS Browser validation passed');
