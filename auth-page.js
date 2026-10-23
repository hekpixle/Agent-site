/* ============================================================================
   Auth page logic — handles both /login and /register.
   Call initAuthPage('login' | 'register') once DOM is ready.
   ============================================================================ */
function initAuthPage(mode) {
  const form        = document.getElementById('authForm');
  const msg         = document.getElementById('authMsg');
  const submitBtn   = form?.querySelector('.submit-btn');
  const btnLabel    = submitBtn?.querySelector('.btn-label');
  const banner      = document.getElementById('loggedInBanner');

  if (!form) return;

  // ---- If already logged in, show banner + redirect-friendly UI ----
  window.api.me().then((r) => {
    if (r.ok && r.data?.user) {
      const u = r.data.user;
      if (banner) banner.classList.remove('hidden');
      // Disable the form fields so the user knows they're already in
      form.querySelectorAll('input, button').forEach((el) => {
        if (el.tagName === 'BUTTON') {
          el.disabled = true;
          if (btnLabel) btnLabel.textContent = 'قبلاً وارد شده‌اید';
        } else {
          el.disabled = true;
        }
      });
      // Wire up banner links
      const goHome = document.getElementById('goHome');
      const goAdmin = document.getElementById('goAdmin');
      if (goHome) goHome.href = '/';
      if (goAdmin) goAdmin.href = u.is_admin ? '/admin' : '/';
    }
  }).catch(() => {/* not logged in — fine */});

  function showMessage(text, kind) {
    if (!msg) return;
    msg.innerHTML = `<div class="alert ${kind === 'error' ? 'error' : 'success'}">${escapeHtml(text)}</div>`;
  }
  function clearMessage() {
    if (msg) msg.innerHTML = '';
  }
  function setLoading(loading) {
    if (!submitBtn) return;
    submitBtn.classList.toggle('loading', !!loading);
    submitBtn.disabled = !!loading;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessage();

    const email = (document.getElementById('email')?.value || '').trim();
    const password = document.getElementById('password')?.value || '';
    const name = mode === 'register' ? (document.getElementById('name')?.value || '').trim() : null;

    if (!email || !password) {
      showMessage('ایمیل و رمز عبور را وارد کنید.', 'error');
      return;
    }
    if (mode === 'register' && !name) {
      showMessage('نام خود را وارد کنید.', 'error');
      return;
    }
    if (mode === 'register' && password.length < 6) {
      showMessage('رمز عبور باید حداقل ۶ کاراکتر باشد.', 'error');
      return;
    }

    setLoading(true);
    let r;
    try {
      if (mode === 'login') {
        r = await window.api.login(email, password);
      } else {
        r = await window.api.register(email, name, password);
      }
    } catch (e) {
      r = { ok: false, error: e.message || String(e) };
    }
    setLoading(false);

    if (!r.ok) {
      showMessage(r.error || 'خطای ناشناخته', 'error');
      return;
    }

    // Success — redirect to wherever the server pointed
    const redirect = r.data?.redirect || '/';
    showMessage(mode === 'login' ? 'خوش آمدید! در حال انتقال...' : 'حساب ساخته شد! در حال انتقال...', 'success');
    setTimeout(() => { window.location.href = redirect; }, 600);
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }
}
