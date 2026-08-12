import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  genesisBridgePolicy,
  issueGenesisBridgeGrant,
  verifyGenesisBridgeGrant,
} from '../platform/security/genesis-usb-policy.js';

const signingSecret = 'atlas-test-only-signing-secret-0123456789abcdef';
const userId = 'user-test-1';
const usbFingerprint = '0123456789ABCDEF01234567';

const grant = await issueGenesisBridgeGrant({
  signingSecret,
  userId,
  usbFingerprint,
  ttlSeconds: 30,
});

const valid = await verifyGenesisBridgeGrant({
  signingSecret,
  grant,
  expectedUserId: userId,
  expectedUsbFingerprint: usbFingerprint,
});
assert.equal(valid.ok, true, 'valid Genesis bridge grant should verify');

const wrongUsb = await verifyGenesisBridgeGrant({
  signingSecret,
  grant,
  expectedUserId: userId,
  expectedUsbFingerprint: 'WRONG-USB',
});
assert.equal(wrongUsb.ok, false, 'grant must be bound to the expected USB fingerprint');

const policy = genesisBridgePolicy();
assert.equal(policy.requiresInteractiveAuthentication, true);
assert.equal(policy.copiesPasskeyCredentialToUsb, false);
assert.equal(policy.storesPlaintextRootSecret, false);

const cli = await readFile(new URL('../scripts/genesis-usb-bridge.mjs', import.meta.url), 'utf8');
assert.match(cli, /aes-256-gcm/i, 'USB secret must use authenticated encryption');
assert.match(cli, /600_000/, 'USB KDF must use the configured PBKDF2 work factor');
assert.doesNotMatch(cli, /password\s*=\s*["'][^"']+["']/i, 'bridge must not embed plaintext passwords');

console.log('Genesis USB bridge validation passed.');
