(()=>{
  const LONG_PRESS_MS = 360;
  const MOVE_CANCEL_PX = 12;
  const STORE_KEY = 'atlas.dragdrop.shelf.v1';

  let pressTimer = null;
  let pointerId = null;
  let start = null;
  let source = null;
  let preview = null;
  let activeZone = null;
  let payload = null;
  let dragging = false;

  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => [...root.querySelectorAll(s)];

  const emit = (name, detail={}) => {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  };

  const haptic = (duration=12) => {
    try { navigator.vibrate?.(duration); } catch (_) {}
  };

  const getPayload = (el) => {
    const img = el.matches('img') ? el : el.querySelector?.('img');
    const src = el.dataset.atlasDragSrc || img?.currentSrc || img?.src || '';
    const label = el.dataset.atlasDragLabel || img?.alt || el.getAttribute('aria-label') || el.title || 'ATLAS item';
    const type = el.dataset.atlasDragType || (img ? 'image' : 'item');
    const id = el.dataset.atlasDragId || el.id || crypto.randomUUID?.() || String(Date.now());
    return { id, type, label, src, module: el.dataset.atlasModule || '', meta: el.dataset.atlasDragMeta || '' };
  };

  const makePreview = (el, p) => {
    const img = el.matches('img') ? el : el.querySelector?.('img');
    if (img?.src) {
      const node = document.createElement('img');
      node.className = 'atlas-drag-preview';
      node.src = img.currentSrc || img.src;
      node.alt = '';
      return node;
    }
    const node = document.createElement('div');
    node.className = 'atlas-drag-preview atlas-drag-preview-generic';
    node.textContent = p.label;
    return node;
  };

  const ensureShelf = () => {
    let shelf = qs('#atlas-drag-shelf');
    if (shelf) return shelf;

    shelf = document.createElement('div');
    shelf.id = 'atlas-drag-shelf';
    shelf.className = 'atlas-drag-shelf';
    shelf.setAttribute('role', 'toolbar');
    shelf.setAttribute('aria-label', 'ATLAS quick drop destinations');
    shelf.innerHTML = `
      <div class="atlas-dropzone" data-atlas-dropzone="workspace" data-atlas-drop-label="Workspace">Workspace</div>
      <div class="atlas-dropzone" data-atlas-dropzone="notes" data-atlas-drop-label="Notes">Notes</div>
      <div class="atlas-dropzone" data-atlas-dropzone="messages" data-atlas-drop-label="Messages">Messages</div>
      <div class="atlas-dropzone" data-atlas-dropzone="tasks" data-atlas-drop-label="Tasks">Tasks</div>
      <div class="atlas-dropzone" data-atlas-dropzone="report" data-atlas-drop-label="Report">Report</div>
    `;
    document.body.append(shelf);
    return shelf;
  };

  const persistDrop = (zone, p) => {
    try {
      const list = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      list.unshift({ ...p, zone, createdAt: new Date().toISOString() });
      localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, 100)));
    } catch (_) {}
  };

  const setShelfVisible = (visible) => {
    const shelf = ensureShelf();
    shelf.classList.toggle('atlas-drag-shelf-visible', visible);
  };

  const markDraggables = (root=document) => {
    qsa('img:not([data-atlas-drag-disabled="true"]), [data-atlas-draggable="true"]', root).forEach((el)=>{
      if (el.closest('[data-atlas-drag-disabled="true"]')) return;
      el.classList.add('atlas-draggable');
      el.setAttribute('draggable', 'false');
    });
    qsa('[data-atlas-dropzone]', root).forEach(el=>el.classList.add('atlas-dropzone'));
  };

  const clearZone = () => {
    if (activeZone) activeZone.classList.remove('atlas-dropzone-active');
    activeZone = null;
  };

  const zoneAt = (x, y) => {
    const el = document.elementFromPoint(x, y);
    return el?.closest?.('[data-atlas-dropzone]') || null;
  };

  const movePreview = (x, y) => {
    if (!preview) return;
    preview.style.left = `${x}px`;
    preview.style.top = `${y - 34}px`;
  };

  const beginDrag = (x, y) => {
    if (!source || dragging) return;
    dragging = true;
    payload = getPayload(source);
    source.classList.add('atlas-drag-armed');
    preview = makePreview(source, payload);
    document.body.append(preview);
    movePreview(x, y);
    setShelfVisible(true);
    haptic(14);
    emit('atlas:dragstart', { payload, source });
  };

  const cancelPress = () => {
    if (pressTimer) clearTimeout(pressTimer);
    pressTimer = null;
  };

  const reset = () => {
    cancelPress();
    clearZone();
    source?.classList.remove('atlas-drag-armed');
    preview?.remove();
    preview = null;
    source = null;
    payload = null;
    pointerId = null;
    start = null;
    dragging = false;
    setShelfVisible(false);
  };

  const commitDrop = (zoneEl) => {
    const zone = zoneEl?.dataset.atlasDropzone;
    if (!zone || !payload) return false;
    const detail = {
      zone,
      zoneLabel: zoneEl.dataset.atlasDropLabel || zone,
      payload,
      source,
      target: zoneEl
    };
    persistDrop(zone, payload);
    emit('atlas:drop', detail);
    zoneEl.dispatchEvent(new CustomEvent('atlas:drop', { detail, bubbles: true }));
    haptic(20);
    return true;
  };

  const onPointerDown = (e) => {
    if (e.button != null && e.button !== 0) return;
    const candidate = e.target.closest?.('.atlas-draggable, [data-atlas-draggable="true"]');
    if (!candidate || candidate.closest('[data-atlas-drag-disabled="true"]')) return;

    reset();
    source = candidate;
    pointerId = e.pointerId;
    start = { x: e.clientX, y: e.clientY };
    pressTimer = setTimeout(()=>beginDrag(e.clientX, e.clientY), LONG_PRESS_MS);
  };

  const onPointerMove = (e) => {
    if (e.pointerId !== pointerId || !start) return;
    const distance = Math.hypot(e.clientX - start.x, e.clientY - start.y);

    if (!dragging && distance > MOVE_CANCEL_PX) {
      cancelPress();
      return;
    }
    if (!dragging) return;

    e.preventDefault();
    movePreview(e.clientX, e.clientY);
    const next = zoneAt(e.clientX, e.clientY);
    if (next !== activeZone) {
      clearZone();
      activeZone = next;
      activeZone?.classList.add('atlas-dropzone-active');
    }
  };

  const onPointerUp = (e) => {
    if (e.pointerId !== pointerId) return;
    if (dragging) {
      const zone = zoneAt(e.clientX, e.clientY) || activeZone;
      if (zone) commitDrop(zone);
      emit('atlas:dragend', { payload, dropped: Boolean(zone) });
    }
    reset();
  };

  const onContextMenu = (e) => {
    if (dragging || e.target.closest?.('.atlas-draggable')) e.preventDefault();
  };

  const install = () => {
    markDraggables();
    ensureShelf();

    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.addEventListener('pointermove', onPointerMove, { passive: false });
    document.addEventListener('pointerup', onPointerUp, { passive: true });
    document.addEventListener('pointercancel', reset, { passive: true });
    document.addEventListener('contextmenu', onContextMenu);

    const observer = new MutationObserver((mutations)=>{
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;
          markDraggables(node);
          if (node.matches?.('img,[data-atlas-draggable="true"]')) markDraggables(node.parentElement || document);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    window.ATLASDragDrop = {
      version: '1.0.0',
      refresh: markDraggables,
      getShelfItems() {
        try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }
        catch (_) { return []; }
      },
      clearShelf() { localStorage.removeItem(STORE_KEY); },
      registerDropZone(element, name, label=name) {
        if (!element) return;
        element.dataset.atlasDropzone = name;
        element.dataset.atlasDropLabel = label;
        element.classList.add('atlas-dropzone');
      },
      makeDraggable(element, options={}) {
        if (!element) return;
        element.dataset.atlasDraggable = 'true';
        if (options.type) element.dataset.atlasDragType = options.type;
        if (options.label) element.dataset.atlasDragLabel = options.label;
        if (options.id) element.dataset.atlasDragId = options.id;
        markDraggables(element.parentElement || document);
      }
    };

    emit('atlas:dragdrop-ready', { version: window.ATLASDragDrop.version });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
