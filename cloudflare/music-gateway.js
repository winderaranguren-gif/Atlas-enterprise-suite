'use strict';

const APPLE_SEARCH_TYPES = new Set(['songs', 'albums', 'artists', 'music-videos', 'playlists']);
const MAX_TERM_LENGTH = 120;
const MAX_LIMIT = 12;

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0'
    }
  });
}

function requestBase() {
  return { requestId: crypto.randomUUID(), at: new Date().toISOString() };
}

function normalizeTerm(url) {
  const term = String(url.searchParams.get('term') || '').trim();
  if (term.length < 2 || term.length > MAX_TERM_LENGTH) return null;
  return term;
}

function normalizeLimit(url) {
  const requested = Number(url.searchParams.get('limit') || 8);
  if (!Number.isFinite(requested)) return 8;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(requested)));
}

function normalizeStorefront(url, env) {
  const candidate = String(url.searchParams.get('storefront') || env.ATLAS_MUSIC_DEFAULT_STOREFRONT || 'us').toLowerCase();
  return /^[a-z]{2}$/.test(candidate) ? candidate : 'us';
}

function normalizeAppleTypes(url) {
  const requested = String(url.searchParams.get('types') || 'songs,albums,artists,music-videos')
    .split(',')
    .map(value => value.trim())
    .filter(value => APPLE_SEARCH_TYPES.has(value));
  return requested.length ? [...new Set(requested)] : ['songs', 'albums', 'artists', 'music-videos'];
}

function artworkUrl(artwork, size = 512) {
  const raw = artwork && typeof artwork.url === 'string' ? artwork.url : '';
  if (!raw) return null;
  return raw.replaceAll('{w}', String(size)).replaceAll('{h}', String(size));
}

function appleItem(resource, type) {
  const attributes = resource && resource.attributes && typeof resource.attributes === 'object' ? resource.attributes : {};
  const title = attributes.name || attributes.title || 'Untitled';
  const artist = attributes.artistName || attributes.curatorName || null;
  const durationMs = Number(attributes.durationInMillis || 0);
  return {
    provider: 'apple-music',
    providerId: String(resource.id || ''),
    mediaType: type,
    title,
    artist,
    album: attributes.albumName || null,
    genreNames: Array.isArray(attributes.genreNames) ? attributes.genreNames : [],
    durationSeconds: Number.isFinite(durationMs) && durationMs > 0 ? Math.round(durationMs / 1000) : null,
    isrc: attributes.isrc || null,
    url: typeof attributes.url === 'string' ? attributes.url : null,
    artwork: artworkUrl(attributes.artwork),
    editorialNotes: attributes.editorialNotes?.short || null,
    rights: {
      catalogPlayback: 'provider-controlled',
      videoPlayback: type === 'music-videos' ? 'provider-controlled' : 'not-applicable',
      atlasVideoSync: 'not-granted',
      commercialReuse: 'not-granted'
    }
  };
}

function youtubeItem(item) {
  const id = item?.id?.videoId;
  const snippet = item?.snippet || {};
  if (!id) return null;
  const thumbs = snippet.thumbnails || {};
  const thumbnail = thumbs.maxres?.url || thumbs.standard?.url || thumbs.high?.url || thumbs.medium?.url || thumbs.default?.url || null;
  return {
    provider: 'youtube',
    providerId: id,
    mediaType: 'video',
    title: snippet.title || 'Untitled video',
    artist: snippet.channelTitle || null,
    channelId: snippet.channelId || null,
    publishedAt: snippet.publishedAt || null,
    thumbnail,
    embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(id)}`,
    watchUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`,
    rights: {
      catalogPlayback: 'provider-controlled',
      videoPlayback: 'provider-controlled',
      atlasVideoSync: 'not-granted',
      commercialReuse: 'not-granted'
    }
  };
}

function providerStatus(env) {
  return {
    atlasOriginals: { configured: true, playback: true, creatorUse: true },
    appleMusic: {
      configured: Boolean(env.APPLE_MUSIC_DEVELOPER_TOKEN),
      catalogSearch: Boolean(env.APPLE_MUSIC_DEVELOPER_TOKEN),
      musicKitPlayback: false,
      activationRequirement: 'APPLE_MUSIC_DEVELOPER_TOKEN + MusicKit web authorization'
    },
    youtube: {
      configured: Boolean(env.YOUTUBE_API_KEY),
      search: Boolean(env.YOUTUBE_API_KEY),
      embeddedPlayback: Boolean(env.YOUTUBE_API_KEY),
      activationRequirement: 'YOUTUBE_API_KEY'
    }
  };
}

async function searchApple(url, env, base) {
  if (!env.APPLE_MUSIC_DEVELOPER_TOKEN) {
    return json({ ...base, ok: false, provider: 'apple-music', error: 'provider_not_configured' }, 503);
  }

  const term = normalizeTerm(url);
  if (!term) return json({ ...base, ok: false, error: 'invalid_search_term' }, 400);

  const storefront = normalizeStorefront(url, env);
  const types = normalizeAppleTypes(url);
  const limit = normalizeLimit(url);
  const endpoint = new URL(`https://api.music.apple.com/v1/catalog/${storefront}/search`);
  endpoint.searchParams.set('term', term);
  endpoint.searchParams.set('types', types.join(','));
  endpoint.searchParams.set('limit', String(limit));

  let upstream;
  try {
    upstream = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${env.APPLE_MUSIC_DEVELOPER_TOKEN}`,
        Accept: 'application/json'
      }
    });
  } catch {
    return json({ ...base, ok: false, provider: 'apple-music', error: 'provider_unreachable' }, 502);
  }

  if (!upstream.ok) {
    return json({ ...base, ok: false, provider: 'apple-music', error: 'provider_error', providerStatus: upstream.status }, 502);
  }

  let payload;
  try {
    payload = await upstream.json();
  } catch {
    return json({ ...base, ok: false, provider: 'apple-music', error: 'invalid_provider_response' }, 502);
  }

  const items = [];
  for (const type of types) {
    const rows = payload?.results?.[type]?.data;
    if (!Array.isArray(rows)) continue;
    for (const resource of rows) items.push(appleItem(resource, type));
  }

  return json({
    ...base,
    ok: true,
    provider: 'apple-music',
    storefront,
    term,
    items
  });
}

async function searchYouTube(url, env, base) {
  if (!env.YOUTUBE_API_KEY) {
    return json({ ...base, ok: false, provider: 'youtube', error: 'provider_not_configured' }, 503);
  }

  const term = normalizeTerm(url);
  if (!term) return json({ ...base, ok: false, error: 'invalid_search_term' }, 400);

  const limit = normalizeLimit(url);
  const regionCode = normalizeStorefront(url, env).toUpperCase();
  const endpoint = new URL('https://www.googleapis.com/youtube/v3/search');
  endpoint.searchParams.set('part', 'snippet');
  endpoint.searchParams.set('type', 'video');
  endpoint.searchParams.set('q', term);
  endpoint.searchParams.set('maxResults', String(limit));
  endpoint.searchParams.set('safeSearch', 'moderate');
  endpoint.searchParams.set('videoEmbeddable', 'true');
  endpoint.searchParams.set('videoSyndicated', 'true');
  endpoint.searchParams.set('regionCode', regionCode);
  endpoint.searchParams.set('key', env.YOUTUBE_API_KEY);

  let upstream;
  try {
    upstream = await fetch(endpoint, { headers: { Accept: 'application/json' } });
  } catch {
    return json({ ...base, ok: false, provider: 'youtube', error: 'provider_unreachable' }, 502);
  }

  if (!upstream.ok) {
    return json({ ...base, ok: false, provider: 'youtube', error: 'provider_error', providerStatus: upstream.status }, 502);
  }

  let payload;
  try {
    payload = await upstream.json();
  } catch {
    return json({ ...base, ok: false, provider: 'youtube', error: 'invalid_provider_response' }, 502);
  }

  const items = Array.isArray(payload.items) ? payload.items.map(youtubeItem).filter(Boolean) : [];
  return json({
    ...base,
    ok: true,
    provider: 'youtube',
    regionCode,
    term,
    items
  });
}

export async function handleMusicApi(request, url, env, suppliedBase) {
  const base = suppliedBase || requestBase();
  if (request.method !== 'GET') return json({ ...base, ok: false, error: 'method_not_allowed' }, 405);

  if (url.pathname === '/api/music/status') {
    return json({
      ...base,
      ok: true,
      service: 'ATLAS Music Provider Gateway',
      providers: providerStatus(env),
      policy: {
        thirdPartyFilesMirrored: false,
        providerSecretsExposedToBrowser: false,
        unknownSyncRightsBlocked: true
      }
    });
  }

  if (url.pathname === '/api/music/apple/search') return searchApple(url, env, base);
  if (url.pathname === '/api/music/youtube/search') return searchYouTube(url, env, base);

  return json({ ...base, ok: false, error: 'music_api_not_found', path: url.pathname }, 404);
}
