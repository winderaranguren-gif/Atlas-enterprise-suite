const bridgeManifest = Object.freeze({
  id: 'atlas-bridge',
  name: 'ATLAS Bridge',
  tagline: 'One World, Every Screen.',
  version: '0.1.0',
  stage: 'foundation',
  principles: ['consent-first', 'local-first', 'encrypted', 'resumable', 'cross-device'],
  transports: {
    preferred: ['local-wifi'],
    fallback: ['usb', 'encrypted-relay'],
    discovery: ['bluetooth', 'qr', 'device-code']
  },
  capabilities: [
    { id: 'edge-push', name: 'Edge Push', status: 'planned', note: 'Gesture is available inside ATLAS; iOS system-wide use depends on Apple platform permissions.' },
    { id: 'universal-drop', name: 'Universal Drop', status: 'planned' },
    { id: 'handoff', name: 'ATLAS Handoff', status: 'planned' },
    { id: 'clipboard', name: 'Universal Clipboard', status: 'planned' },
    { id: 'file-transfer', name: 'Encrypted File Transfer', status: 'planned' },
    { id: 'camera-microphone', name: 'Shared Camera & Microphone', status: 'planned' },
    { id: 'atlas-desk', name: 'ATLAS Desk', status: 'planned' },
    { id: 'voice-command', name: 'Voice Transfer Commands', status: 'planned' }
  ],
  safety: {
    pairingRequired: true,
    sensitiveTransferConfirmation: true,
    endToEndEncryptionRequired: true,
    auditEvents: true,
    automaticReceive: 'trusted-devices-only'
  }
});

const headers = { 'cache-control': 'no-store' };

export async function bridgeRoutes(request, _env, url) {
  if (url.pathname === '/api/bridge/status' && request.method === 'GET') {
    return Response.json({ ok: true, service: bridgeManifest.id, version: bridgeManifest.version, stage: bridgeManifest.stage }, { headers });
  }

  if (url.pathname === '/api/bridge/capabilities' && request.method === 'GET') {
    return Response.json({ ok: true, ...bridgeManifest }, { headers });
  }

  if (url.pathname === '/api/bridge/transfer' || url.pathname === '/api/bridge/pair') {
    return Response.json({
      ok: false,
      error: 'not_implemented',
      message: 'ATLAS Bridge foundation is published; secure pairing and transfer execution are not enabled yet.'
    }, { status: 501, headers });
  }

  return null;
}

export { bridgeManifest };
