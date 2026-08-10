'use strict';

(() => {
  const state = {
    status: null,
    querySequence: 0,
    debounceTimer: null,
    activeQuery: ''
  };

  const style = document.createElement('style');
  style.textContent = `
    .provider-results{margin:0 0 24px;padding:18px;border:1px solid var(--line,#203247);border-radius:22px;background:rgba(6,15,26,.72)}
    .provider-results-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:14px}
    .provider-results-head h2{margin:0;font-size:18px}.provider-results-head p{margin:5px 0 0;color:var(--muted,#8fa4b8);font-size:12px;line-height:1.55}
    .provider-summary{display:flex;flex-wrap:wrap;gap:7px;justify-content:flex-end}.provider-pill{border:1px solid var(--line,#203247);border-radius:999px;padding:5px 8px;font-size:10px;color:var(--muted,#8fa4b8);white-space:nowrap}.provider-pill.on{color:#bff5de;border-color:rgba(62,207,142,.45)}
    .provider-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px}.provider-card{overflow:hidden;border:1px solid var(--line,#203247);border-radius:18px;background:rgba(9,20,34,.88);display:flex;flex-direction:column;min-height:250px}.provider-art{aspect-ratio:16/10;background:#07131f;overflow:hidden;display:grid;place-items:center}.provider-art img{width:100%;height:100%;object-fit:cover;display:block}.provider-art-fallback{font-size:28px;color:#5fb9ff}.provider-copy{padding:12px;display:flex;flex:1;flex-direction:column;gap:5px}.provider-source{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#69c7ff}.provider-copy strong{font-size:13px;line-height:1.35}.provider-copy small{font-size:11px;color:var(--muted,#8fa4b8);line-height:1.45}.provider-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:auto;padding-top:8px}.provider-actions button,.provider-actions a{font:inherit;font-size:10px;border:1px solid var(--line,#203247);border-radius:999px;padding:7px 9px;background:transparent;color:inherit;text-decoration:none;cursor:pointer}.provider-actions .provider-primary{background:#0b6fff;border-color:#0b6fff;color:white}.provider-actions [disabled]{opacity:.45;cursor:not-allowed}.provider-rights{margin-top:7px;padding-top:7px;border-top:1px solid var(--line,#203247);font-size:10px;color:var(--muted,#8fa4b8)}
    .provider-empty{padding:18px;border:1px dashed var(--line,#203247);border-radius:16px;color:var(--muted,#8fa4b8);font-size:12px}.provider-loading{font-size:12px;color:var(--muted,#8fa4b8)}
    .provider-video-overlay{position:fixed;inset:0;z-index:10050;background:rgba(0,4,9,.88);display:grid;place-items:center;padding:18px}.provider-video-dialog{width:min(980px,96vw);background:#050d17;border:1px solid #203247;border-radius:22px;overflow:hidden}.provider-video-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px}.provider-video-head strong{font-size:13px}.provider-video-head button{border:1px solid #203247;background:transparent;color:white;border-radius:999px;width:34px;height:34px;cursor:pointer}.provider-video-frame{aspect-ratio:16/9;background:black}.provider-video-frame iframe{width:100%;height:100%;border:0;display:block}.provider-video-note{padding:10px 14px;color:#8fa4b8;font-size:11px;line-height:1.55}
    @media(max-width:720px){.provider-results-head{flex-direction:column}.provider-summary{justify-content:flex-start}.provider-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.provider-card{min-height:220px}}
    @media(max-width:440px){.provider-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  function api(path) {
    return fetch(path, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    }).then(async response => {
      let payload = null;
      try { payload = await response.json(); } catch { payload = null; }
      if (!response.ok || !payload?.ok) {
        const error = new Error(payload?.error || `http_${response.status}`);
        error.status = response.status;
        error.payload = payload;
        throw error;
      }
      return payload;
    });
  }

  async function refreshStatus() {
    try {
      state.status = await api('/api/music/status');
    } catch {
      state.status = null;
    }
    updateProviderButton();
    return state.status;
  }

  function updateProviderButton() {
    const button = document.getElementById('provider-btn');
    if (!button) return;
    const providers = state.status?.providers;
    if (!providers) {
      button.title = 'ATLAS Music Provider Gateway no disponible en este entorno.';
      return;
    }
    const active = [providers.atlasOriginals?.configured, providers.appleMusic?.configured, providers.youtube?.configured].filter(Boolean).length;
    button.title = `${active}/3 proveedores configurados`;
  }

  function searchApple(term, options = {}) {
    const params = new URLSearchParams({
      term,
      limit: String(options.limit || 8),
      storefront: options.storefront || 'us',
      types: options.types || 'songs,albums,artists,music-videos'
    });
    return api(`/api/music/apple/search?${params.toString()}`);
  }

  function searchYouTube(term, options = {}) {
    const params = new URLSearchParams({
      term,
      limit: String(options.limit || 8),
      storefront: options.storefront || 'us'
    });
    return api(`/api/music/youtube/search?${params.toString()}`);
  }

  function providerLabel(provider) {
    if (provider === 'apple-music') return 'Apple Music';
    if (provider === 'youtube') return 'YouTube';
    return provider || 'Provider';
  }

  function mediaTypeLabel(type) {
    const labels = {
      songs: 'Song',
      albums: 'Album',
      artists: 'Artist',
      playlists: 'Playlist',
      'music-videos': 'Music video',
      video: 'Video'
    };
    return labels[type] || type || 'Media';
  }

  function createElement(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function makeCard(item) {
    const card = createElement('article', 'provider-card');
    const art = createElement('div', 'provider-art');
    const imageUrl = item.artwork || item.thumbnail;
    if (imageUrl) {
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = item.title ? `Artwork for ${item.title}` : 'Music artwork';
      img.loading = 'lazy';
      art.appendChild(img);
    } else {
      art.appendChild(createElement('span', 'provider-art-fallback', item.provider === 'youtube' ? '▶' : '♫'));
    }
    card.appendChild(art);

    const copy = createElement('div', 'provider-copy');
    copy.appendChild(createElement('span', 'provider-source', `${providerLabel(item.provider)} · ${mediaTypeLabel(item.mediaType)}`));
    copy.appendChild(createElement('strong', '', item.title || 'Untitled'));
    if (item.artist) copy.appendChild(createElement('small', '', item.artist));
    if (item.album) copy.appendChild(createElement('small', '', item.album));

    const actions = createElement('div', 'provider-actions');
    if (item.provider === 'youtube' && item.embedUrl) {
      const watch = createElement('button', 'provider-primary', 'Ver video');
      watch.type = 'button';
      watch.addEventListener('click', () => openVideo(item));
      actions.appendChild(watch);
    }
    if (item.url) {
      const link = createElement('a', item.provider === 'apple-music' ? 'provider-primary' : '', `Abrir en ${providerLabel(item.provider)}`);
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      actions.appendChild(link);
    } else if (item.watchUrl) {
      const link = createElement('a', '', 'Abrir en YouTube');
      link.href = item.watchUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      actions.appendChild(link);
    }

    const creator = createElement('button', '', 'Usar en ATLAS Video');
    creator.type = 'button';
    creator.disabled = true;
    creator.title = 'Bloqueado: la reproducción del proveedor no concede derechos de sincronización para producciones de ATLAS.';
    actions.appendChild(creator);
    copy.appendChild(actions);

    const rights = createElement('div', 'provider-rights');
    rights.textContent = 'Playback: proveedor · ATLAS Video/uso comercial: bloqueado hasta licencia específica';
    copy.appendChild(rights);
    card.appendChild(copy);
    return card;
  }

  function statusPill(label, configured) {
    const pill = createElement('span', `provider-pill${configured ? ' on' : ''}`);
    pill.textContent = `${configured ? '●' : '○'} ${label}`;
    return pill;
  }

  function providerMount() {
    return document.getElementById('music-content');
  }

  function removeResults() {
    document.getElementById('atlas-provider-results')?.remove();
  }

  function renderLoading(term) {
    const mount = providerMount();
    if (!mount) return;
    removeResults();
    const section = createElement('section', 'provider-results');
    section.id = 'atlas-provider-results';
    const header = createElement('div', 'provider-results-head');
    const copy = createElement('div');
    copy.appendChild(createElement('h2', '', 'Catálogo global autorizado'));
    copy.appendChild(createElement('p', '', `Buscando “${term}” en proveedores configurados…`));
    header.appendChild(copy);
    section.appendChild(header);
    section.appendChild(createElement('div', 'provider-loading', 'Consultando catálogo y video mediante ATLAS Provider Gateway…'));
    mount.prepend(section);
  }

  function renderResults(term, groups) {
    const mount = providerMount();
    if (!mount) return;
    removeResults();

    const section = createElement('section', 'provider-results');
    section.id = 'atlas-provider-results';
    const header = createElement('div', 'provider-results-head');
    const copy = createElement('div');
    copy.appendChild(createElement('h2', '', 'Catálogo global autorizado'));
    copy.appendChild(createElement('p', '', `Resultados externos para “${term}”. ATLAS conserva el proveedor y bloquea automáticamente usos no licenciados.`));
    header.appendChild(copy);

    const summary = createElement('div', 'provider-summary');
    const providers = state.status?.providers || {};
    summary.appendChild(statusPill('ATLAS Originals', true));
    summary.appendChild(statusPill('Apple Music', Boolean(providers.appleMusic?.configured)));
    summary.appendChild(statusPill('YouTube', Boolean(providers.youtube?.configured)));
    header.appendChild(summary);
    section.appendChild(header);

    const items = groups.flatMap(group => Array.isArray(group?.items) ? group.items : []);
    if (!items.length) {
      section.appendChild(createElement('div', 'provider-empty', 'No hay resultados externos disponibles. Si un proveedor aparece desconectado, falta configurar su credencial únicamente en el servidor.'));
    } else {
      const grid = createElement('div', 'provider-grid');
      items.slice(0, 20).forEach(item => grid.appendChild(makeCard(item)));
      section.appendChild(grid);
    }
    mount.prepend(section);
  }

  async function runSearch(term) {
    const query = String(term || '').trim();
    state.activeQuery = query;
    if (query.length < 2) {
      removeResults();
      return;
    }

    const sequence = ++state.querySequence;
    renderLoading(query);
    if (!state.status) await refreshStatus();

    const providers = state.status?.providers || {};
    const tasks = [];
    if (providers.appleMusic?.configured) tasks.push(searchApple(query).catch(() => ({ provider: 'apple-music', items: [] })));
    if (providers.youtube?.configured) tasks.push(searchYouTube(query).catch(() => ({ provider: 'youtube', items: [] })));

    if (!tasks.length) {
      if (sequence === state.querySequence) renderResults(query, []);
      return;
    }

    const groups = await Promise.all(tasks);
    if (sequence !== state.querySequence || state.activeQuery !== query) return;
    renderResults(query, groups);
  }

  function openVideo(item) {
    closeVideo();
    const overlay = createElement('div', 'provider-video-overlay');
    overlay.id = 'atlas-provider-video';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', item.title || 'Provider video');

    const dialog = createElement('div', 'provider-video-dialog');
    const head = createElement('div', 'provider-video-head');
    head.appendChild(createElement('strong', '', item.title || 'Video'));
    const close = createElement('button', '', '✕');
    close.type = 'button';
    close.setAttribute('aria-label', 'Cerrar video');
    close.addEventListener('click', closeVideo);
    head.appendChild(close);
    dialog.appendChild(head);

    const frameWrap = createElement('div', 'provider-video-frame');
    const iframe = document.createElement('iframe');
    iframe.src = item.embedUrl;
    iframe.title = item.title || 'YouTube video';
    iframe.loading = 'eager';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allow = 'accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    frameWrap.appendChild(iframe);
    dialog.appendChild(frameWrap);
    dialog.appendChild(createElement('div', 'provider-video-note', `Fuente: YouTube${item.artist ? ` · ${item.artist}` : ''}. Ver el video dentro de ATLAS no concede permiso para copiarlo, descargarlo ni reutilizarlo en una producción.`));
    overlay.appendChild(dialog);
    overlay.addEventListener('click', event => { if (event.target === overlay) closeVideo(); });
    document.body.appendChild(overlay);
    close.focus();
  }

  function closeVideo() {
    document.getElementById('atlas-provider-video')?.remove();
  }

  function bindSearch() {
    const input = document.getElementById('search-input');
    if (!input) return;
    input.addEventListener('input', () => {
      clearTimeout(state.debounceTimer);
      const value = input.value;
      state.debounceTimer = setTimeout(() => runSearch(value), 450);
    });
    input.addEventListener('search', () => {
      clearTimeout(state.debounceTimer);
      runSearch(input.value);
    });
  }

  function init() {
    bindSearch();
    refreshStatus();
  }

  window.ATLASMusicProviders = Object.freeze({
    refreshStatus,
    searchApple,
    searchYouTube,
    runSearch
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
