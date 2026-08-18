const MAX_PEERS = 12;
const MAX_MESSAGE_BYTES = 160000;
const ALLOWED_TYPES = new Set(['offer','answer','ice','hangup','media-state','ready','transcript','consent','note']);

function safePeer(value) {
  return String(value || crypto.randomUUID()).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64) || crypto.randomUUID();
}

function safeChannel(value) {
  return String(value || 'media').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) || 'media';
}

function safeSend(ws, payload) {
  try { ws.send(JSON.stringify(payload)); } catch (_) {}
}

function attachment(ws) {
  return ws.deserializeAttachment?.() || {};
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
    const url = new URL(request.url);
    const peer = safePeer(url.searchParams.get('peer'));
    const channel = safeChannel(url.searchParams.get('channel'));
    const sameChannel = this.ctx.getWebSockets().filter(ws => safeChannel(attachment(ws).channel) === channel);
    if (sameChannel.length >= MAX_PEERS) return new Response('Room full', { status: 429 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.serializeAttachment({ peer, channel });
    this.ctx.acceptWebSocket(server);
    safeSend(server, { type: 'welcome', peer, channel, peers: sameChannel.length });
    for (const ws of sameChannel) safeSend(ws, { type: 'peer-joined', peer, channel });
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    if (typeof message !== 'string' || message.length > MAX_MESSAGE_BYTES) return;
    let data;
    try { data = JSON.parse(message); } catch (_) { return; }
    if (data?.type === 'ping') { safeSend(ws, { type: 'pong', at: Date.now() }); return; }
    if (!ALLOWED_TYPES.has(data?.type)) return;
    const meta = attachment(ws);
    const channel = safeChannel(meta.channel);
    const payload = { ...data, from: safePeer(meta.peer), channel, at: Date.now() };
    delete payload.to;
    for (const peerSocket of this.ctx.getWebSockets()) {
      if (peerSocket === ws) continue;
      if (safeChannel(attachment(peerSocket).channel) !== channel) continue;
      safeSend(peerSocket, payload);
    }
  }

  async webSocketClose(ws, code, reason) {
    const meta = attachment(ws);
    const peer = safePeer(meta.peer);
    const channel = safeChannel(meta.channel);
    for (const peerSocket of this.ctx.getWebSockets()) {
      if (peerSocket === ws) continue;
      if (safeChannel(attachment(peerSocket).channel) !== channel) continue;
      safeSend(peerSocket, { type: 'peer-left', peer, channel, at: Date.now() });
    }
    try { ws.close(code || 1000, reason || 'closed'); } catch (_) {}
  }

  async webSocketError(ws) {
    const meta = attachment(ws);
    const peer = safePeer(meta.peer);
    const channel = safeChannel(meta.channel);
    for (const peerSocket of this.ctx.getWebSockets()) {
      if (peerSocket === ws) continue;
      if (safeChannel(attachment(peerSocket).channel) !== channel) continue;
      safeSend(peerSocket, { type: 'peer-left', peer, channel, at: Date.now() });
    }
  }
}
