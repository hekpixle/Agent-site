/* ============================================================================
   Theme toggle — persists choice to localStorage, defaults to OS preference
   ============================================================================ */
(function () {
  const STORAGE_KEY = 'hekpixle-theme';

  function getStoredTheme() {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  }
  function storeTheme(t) {
    try { localStorage.setItem(STORAGE_KEY, t); } catch {}
  }

  function resolveInitialTheme() {
    const stored = getStoredTheme();
    if (stored === 'light' || stored === 'dark') return stored;
    // Default: light (matches Hekpixle desktop app default)
    return 'light';
  }

  function applyTheme(t) {
    document.body.dataset.theme = (t === 'dark') ? 'dark' : 'light';
  }

  // Apply immediately (before paint to avoid flash)
  applyTheme(resolveInitialTheme());

  // Wire up the toggle button once DOM is ready
  function init() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const current = document.body.dataset.theme === 'dark' ? 'dark' : 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      storeTheme(next);
      // Notify listeners (e.g. the 3D hero so it can swap colors)
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
