import assert from 'node:assert/strict';
import { sanitizePortalUrl } from '../modules/connectivity/routes.js';

const sample='https://connect-edge.ihg.com/?propertyid=MCOPP&mauth=secret&client_ip=10.0.0.2&client_mac=aa:bb:cc:dd:ee:ff&ap_name=ROOM504';
const result=sanitizePortalUrl(sample);

assert.equal(result.ok,true);
assert.equal(result.hostname,'connect-edge.ihg.com');
assert.equal(result.captivePortalLikely,true);
assert.match(result.safeUrl,/propertyid=MCOPP/);
assert.match(result.safeUrl,/ap_name=ROOM504/);
assert.doesNotMatch(result.safeUrl,/secret/);
assert.doesNotMatch(result.safeUrl,/client_ip/i);
assert.doesNotMatch(result.safeUrl,/client_mac/i);
assert.ok(result.removedSensitiveParameters.includes('mauth'));
assert.ok(result.removedSensitiveParameters.includes('client_ip'));
assert.ok(result.removedSensitiveParameters.includes('client_mac'));

const invalid=sanitizePortalUrl('file:///etc/passwd');
assert.equal(invalid.ok,false);
assert.equal(invalid.error,'unsupported_protocol');

console.log('connectivity validation passed');
