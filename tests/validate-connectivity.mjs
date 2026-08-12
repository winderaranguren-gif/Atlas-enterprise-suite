import assert from 'node:assert/strict';
import { sanitizePortalUrl } from '../modules/connectivity/routes.js';
import { CONNECTIVITY_CATALOG, flattenConnectivityCapabilities, findConnectivityCapability } from '../modules/connectivity/service-catalog.js';

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

assert.equal(CONNECTIVITY_CATALOG.exclusions.phoneModels,true);
assert.equal(CONNECTIVITY_CATALOG.exclusions.handsetCatalog,true);
assert.equal(CONNECTIVITY_CATALOG.exclusions.manufacturerModelPages,true);
assert.equal(CONNECTIVITY_CATALOG.exclusions.copiedCarrierBranding,true);

const capabilities=flattenConnectivityCapabilities();
assert.ok(capabilities.length>=30);
assert.ok(findConnectivityCapability('fiber'));
assert.ok(findConnectivityCapability('prepaid'));
assert.ok(findConnectivityCapability('sd-wan'));
assert.ok(findConnectivityCapability('iot-assets'));
assert.ok(findConnectivityCapability('connected-fleet'));
assert.ok(findConnectivityCapability('disaster-recovery'));
assert.ok(findConnectivityCapability('contact-center'));
assert.equal(findConnectivityCapability('phone-models'),null);
assert.equal(capabilities.some(item=>/iphone|galaxy|pixel/i.test(`${item.id} ${item.name}`)),false);

console.log('connectivity validation passed');
