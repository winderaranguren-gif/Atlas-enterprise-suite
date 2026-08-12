const encoder = new TextEncoder();
const decoder = new TextDecoder();

function b64urlEncode(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function b64urlDecode(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

async function importHmacKey(secret) {
  if (!secret || secret.length < 32) throw new Error('GENESIS_BRIDGE_SIGNING_SECRET must contain at least 32 characters');
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function issueGenesisBridgeGrant({ signingSecret, userId, usbFingerprint, ttlSeconds = 90 }) {
  if (!userId) throw new Error('userId is required');
  if (!usbFingerprint) throw new Error('usbFingerprint is required');
  if (ttlSeconds < 15 || ttlSeconds > 300) throw new Error('ttlSeconds must be between 15 and 300');

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    typ: 'atlas-genesis-usb-grant',
    sub: String(userId),
    usb: String(usbFingerprint),
    iat: now,
    exp: now + ttlSeconds,
    nonce: crypto.randomUUID(),
  };

  const body = b64urlEncode(encoder.encode(JSON.stringify(payload)));
  const key = await importHmacKey(signingSecret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return `${body}.${b64urlEncode(new Uint8Array(signature))}`;
}

export async function verifyGenesisBridgeGrant({ signingSecret, grant, expectedUserId, expectedUsbFingerprint }) {
  if (!grant || typeof grant !== 'string') return { ok: false, error: 'missing_genesis_bridge_grant' };
  const parts = grant.split('.');
  if (parts.length !== 2) return { ok: false, error: 'invalid_genesis_bridge_grant' };

  const [body, signatureText] = parts;
  try {
    const key = await importHmacKey(signingSecret);
    const verified = await crypto.subtle.verify(
      'HMAC',
      key,
      b64urlDecode(signatureText),
      encoder.encode(body),
    );
    if (!verified) return { ok: false, error: 'invalid_genesis_bridge_signature' };

    const payload = JSON.parse(decoder.decode(b64urlDecode(body)));
    const now = Math.floor(Date.now() / 1000);
    if (payload.typ !== 'atlas-genesis-usb-grant') return { ok: false, error: 'invalid_genesis_bridge_type' };
    if (!Number.isInteger(payload.exp) || payload.exp <= now) return { ok: false, error: 'expired_genesis_bridge_grant' };
    if (String(payload.sub) !== String(expectedUserId)) return { ok: false, error: 'genesis_bridge_user_mismatch' };
    if (String(payload.usb) !== String(expectedUsbFingerprint)) return { ok: false, error: 'genesis_bridge_usb_mismatch' };
    return { ok: true, payload };
  } catch {
    return { ok: false, error: 'invalid_genesis_bridge_grant' };
  }
}

export function genesisBridgePolicy() {
  return Object.freeze({
    requiresInteractiveAuthentication: true,
    copiesPasskeyCredentialToUsb: false,
    storesPlaintextRootSecret: false,
    grantMaxTtlSeconds: 300,
  });
}
