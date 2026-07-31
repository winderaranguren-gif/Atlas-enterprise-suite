(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const validPages = new Set([
    'dashboard', 'crm', 'invoices', 'expenses', 'accounting', 'inventory',
    'employees', 'reports', 'freight', 'documents', 'ride', 'cars', 'health',
    'safety', 'community', 'modules', 'audit', 'settings'
  ]);

  const getState = () => {
    try {
      return JSON.parse(localStorage.getItem('atlas-enterprise-v1') || '{}');
    } catch {
      return {};
    }
  };

  const savePage = (page) => {
    const state = getState();
    state.page = page;
    localStorage.setItem('atlas-enterprise-v1', JSON.stringify(state));
  };

  const syncUrl = (page, replace = false) => {
    const url = new URL(window.location.href);
    url.searchParams.set('module', page);
    const method = replace ? 'replaceState' : 'pushState';
    history[method]({ atlasPage: page }, '', url);
  };

  const resetContentScroll = () => {
    const content = $('#content');
    if (content) content.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  };

  const closeMobileMenu = () => {
    $('#sidebar')?.classList.remove('open');
  };

  document.addEventListener('click', (event) => {
    const navButton = event.target.closest('#main-nav [data-page]');
    if (!navButton) return;

    const page = navButton.dataset.page;
    if (!validPages.has(page)) return;

    savePage(page);
    syncUrl(page);
    closeMobileMenu();
    requestAnimationFrame(resetContentScroll);
  }, true);

  document.addEventListener('click', (event) => {
    const sidebar = $('#sidebar');
    const menuButton = $('#menu-btn');
    if (!sidebar?.classList.contains('open')) return;
    if (sidebar.contains(event.target) || menuButton?.contains(event.target)) return;
    closeMobileMenu();
  });

  window.addEventListener('popstate', (event) => {
    const urlPage = new URL(window.location.href).searchParams.get('module');
    const page = event.state?.atlasPage || urlPage || 'dashboard';
    if (!validPages.has(page)) return;

    const current = getState();
    if (current.page === page) {
      resetContentScroll();
      return;
    }

    savePage(page);
    window.location.reload();
  });

  window.addEventListener('DOMContentLoaded', () => {
    const urlPage = new URL(window.location.href).searchParams.get('module');
    const state = getState();
    const page = validPages.has(urlPage) ? urlPage : (validPages.has(state.page) ? state.page : 'dashboard');

    if (state.page !== page) savePage(page);
    syncUrl(page, true);

    const content = $('#content');
    if (content) {
      content.setAttribute('aria-live', 'polite');
      content.setAttribute('aria-busy', 'false');
    }
  });
})();
