const MAX_PEERS = 8;
const MAX_MESSAGE_BYTES = 160000;
const ALLOWED_TYPES = new Set(['offer','answer','ice','hangup','media-state','ready']);

function safePeer(value) {
  return String(value || crypto.randomUUID()).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64) || crypto.randomUUID();
}

function safeSend(ws, payload) {
  try { ws.send(JSON.stringify(payload)); } catch (_) {}
}

export class VideoRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request) {
    if ((request.headers.get('Upgrade') || '').toLowerCase() !== 'websocket') {
      return Response.json({ ok: true, service: 'ATLAS Video Signaling', peers: this.ctx.getWebSockets().length }, { headers: { 'cache-control': 'no-store' } });
    }
    const existing = this.ctx.getWebSockets();
    if (existing.length >= MAX_PEERS) return new Response('Room full', { status: 429 });
    const url = new URL(request.url);
    const peer = safePeer(url.searchParams.get('peer'));
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.serializeAttachment({ peer });
    this.ctx.acceptWebSocket(server);
    safeSend(server, { type: 'welcome', peer, peers: existing.length });
    for (const ws of existing) safeSend(ws, { type: 'peer-joined', peer });
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    if (typeof message !== 'string' || message.length > MAX_MESSAGE_BYTES) return;
    let data;
    try { data = JSON.parse(message); } catch (_) { return; }
    if (data?.type === 'ping') { safeSend(ws, { type: 'pong', at: Date.now() }); return; }
    if (!ALLOWED_TYPES.has(data?.type)) return;
    const attachment = ws.deserializeAttachment?.() || {};
    const payload = { ...data, from: safePeer(attachment.peer), at: Date.now() };
    delete payload.to;
    for (const peerSocket of this.ctx.getWebSockets()) if (peerSocket !== ws) safeSend(peerSocket, payload);
  }

  async webSocketClose(ws, code, reason) {
    const attachment = ws.deserializeAttachment?.() || {};
    const peer = safePeer(attachment.peer);
    for (const peerSocket of this.ctx.getWebSockets()) if (peerSocket !== ws) safeSend(peerSocket, { type: 'peer-left', peer, at: Date.now() });
    try { ws.close(code || 1000, reason || 'closed'); } catch (_) {}
  }

  async webSocketError(ws) {
    const attachment = ws.deserializeAttachment?.() || {};
    const peer = safePeer(attachment.peer);
    for (const peerSocket of this.ctx.getWebSockets()) if (peerSocket !== ws) safeSend(peerSocket, { type: 'peer-left', peer, at: Date.now() });
  }
}
