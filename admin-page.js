/* ============================================================================
   Admin panel logic:
   - Tab switching (upload / releases / users)
   - Upload form with drag-drop + progress
   - Releases list with delete
   - Users table
   - Logout button
   ============================================================================ */
(function () {
  'use strict';

  let currentUser = null;

  // -------- Init --------
  function init() {
    // Get current user (admin) for the badge
    window.api.me().then((r) => {
      if (r.ok && r.data?.user) {
        currentUser = r.data.user;
        const badge = document.getElementById('userBadge');
        if (badge) badge.textContent = `${currentUser.name} (${currentUser.email})`;
      } else {
        // Not logged in or not admin — server should have already redirected,
        // but if we ended up here, send them to login.
        window.location.href = '/login';
      }
    });

    wireUpTabs();
    wireUpUpload();
    wireUpLogout();
    loadStats();
    loadReleases();
    loadUsers();
  }

  // -------- Tabs --------
  function wireUpTabs() {
    const tabs = document.querySelectorAll('.admin-tab');
    const panes = document.querySelectorAll('.tab-pane');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const name = tab.dataset.tab;
        tabs.forEach((t) => t.classList.toggle('active', t === tab));
        panes.forEach((p) => p.classList.toggle('active', p.dataset.pane === name));
      });
    });
    // Refresh buttons
    const r1 = document.getElementById('btnRefreshReleases');
    if (r1) r1.addEventListener('click', loadReleases);
    const r2 = document.getElementById('btnRefreshUsers');
    if (r2) r2.addEventListener('click', loadUsers);
  }

  // -------- Upload form (drag-drop + multipart submit) --------
  function wireUpUpload() {
    const form = document.getElementById('uploadForm');
    if (!form) return;

    const fileInput = document.getElementById('fileInput');
    const dropZone  = document.getElementById('dropZone');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadBtnLabel = document.getElementById('uploadBtnLabel');
    const uploadSpinner = document.getElementById('uploadSpinner');
    const uploadMsg = document.getElementById('uploadMsg');

    let selectedFile = null;

    function setFileNameDisplay(name) {
      if (!fileNameDisplay) return;
      if (name) {
        fileNameDisplay.textContent = name;
        fileNameDisplay.style.display = 'block';
      } else {
        fileNameDisplay.style.display = 'none';
      }
    }

    function showUploadMsg(text, kind) {
      if (!uploadMsg) return;
      uploadMsg.innerHTML = `<div class="alert ${kind === 'error' ? 'error' : 'success'}">${escapeHtml(text)}</div>`;
    }
    function clearUploadMsg() {
      if (uploadMsg) uploadMsg.innerHTML = '';
    }

    // File input change
    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        selectedFile = fileInput.files[0];
        dropZone.classList.add('has-file');
        setFileNameDisplay(selectedFile.name + ' (' + formatBytes(selectedFile.size) + ')');
      }
    });

    // Drag-drop
    ['dragenter', 'dragover'].forEach((ev) => {
      dropZone.addEventListener(ev, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach((ev) => {
      dropZone.addEventListener(ev, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('dragover');
      });
    });
    dropZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer?.files;
      if (files && files[0]) {
        selectedFile = files[0];
        fileInput.files = files;  // sync the input so the form has the file
        dropZone.classList.add('has-file');
        setFileNameDisplay(selectedFile.name + ' (' + formatBytes(selectedFile.size) + ')');
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearUploadMsg();

      if (!selectedFile) {
        showUploadMsg('یک فایل انتخاب کنید.', 'error');
        return;
      }
      const version = document.getElementById('version').value.trim();
      const description = document.getElementById('description').value.trim();
      if (!version) { showUploadMsg('نسخه را وارد کنید.', 'error'); return; }
      if (!description) { showUploadMsg('توضیحات را وارد کنید.', 'error'); return; }

      // Build FormData
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('version', version);
      fd.append('description', description);

      // UI: loading + progress bar
      const pBox = document.getElementById('uploadProgress');
      const pText = document.getElementById('uploadProgressText');
      const pBytes = document.getElementById('uploadProgressBytes');
      const pFill = document.getElementById('uploadProgressFill');
      const toFa = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
      function setProgress(percent, loaded, total) {
        pFill.style.width = percent + '%';
        pText.textContent = toFa(percent) + '٪ آپلود شده';
        pBytes.textContent = formatBytes(loaded) + ' / ' + formatBytes(total);
        uploadBtnLabel.textContent = 'در حال آپلود... ' + toFa(percent) + '٪';
      }
      pBox.classList.remove('hidden', 'processing');
      setProgress(0, 0, selectedFile.size);
      uploadBtn.disabled = true;
      uploadBtnLabel.textContent = 'در حال آپلود... ۰٪';
      uploadSpinner?.classList.remove('hidden');

      let r;
      try {
        r = await window.api.adminUploadWithProgress(
          fd,
          (p) => setProgress(p.percent, p.loaded, p.total),
          () => {
            // all bytes sent — the server is now writing/saving the file
            setProgress(100, selectedFile.size, selectedFile.size);
            pText.textContent = '۱۰۰٪ — در حال ذخیره روی سرور...';
            pBox.classList.add('processing');
          }
        );
      } catch (e) {
        r = { ok: false, error: e.message || String(e) };
      }

      pBox.classList.remove('processing');
      if (!r.ok) pBox.classList.add('hidden');
      else pText.textContent = '✓ ۱۰۰٪ آپلود شد';
      uploadBtn.disabled = false;
      uploadBtnLabel.textContent = 'آپلود نسخه';
      uploadSpinner?.classList.add('hidden');

      if (!r.ok) {
        showUploadMsg(r.error || 'خطا در آپلود', 'error');
        return;
      }

      showUploadMsg('✓ نسخه با موفقیت آپلود شد.', 'success');
      setTimeout(() => pBox.classList.add('hidden'), 2500);
      // Reset form
      form.reset();
      selectedFile = null;
      dropZone.classList.remove('has-file');
      setFileNameDisplay('');
      // Refresh releases + stats
      loadReleases();
      loadStats();
    });
  }

  // -------- Stats --------
  async function loadStats() {
    const elUsers    = document.getElementById('statUsers');
    const elReleases = document.getElementById('statReleases');
    const elLatest   = document.getElementById('statLatest');
    const elSize     = document.getElementById('statSize');

    // Users + releases from admin endpoints
    const [usersR, releasesR] = await Promise.all([
      window.api.adminListUsers(),
      window.api.adminListReleases(),
    ]);

    if (elUsers)    elUsers.textContent    = usersR.ok ? (usersR.data.users?.length || 0) : '—';
    if (elReleases) elReleases.textContent = releasesR.ok ? (releasesR.data.releases?.length || 0) : '—';

    if (releasesR.ok && releasesR.data.releases?.length) {
      const latest = releasesR.data.releases[0];
      if (elLatest) elLatest.textContent = 'v' + latest.version;
      const totalBytes = releasesR.data.releases.reduce((s, r) => s + r.size, 0);
      if (elSize) elSize.textContent = formatBytes(totalBytes);
    } else {
      if (elLatest) elLatest.textContent = '—';
      if (elSize)   elSize.textContent   = '—';
    }
  }

  // -------- Releases list --------
  async function loadReleases() {
    const wrap = document.getElementById('releasesList');
    if (!wrap) return;
    wrap.innerHTML = `<div class="loading-state"><span class="spinner"></span><span>در حال بارگذاری...</span></div>`;

    const r = await window.api.adminListReleases();
    if (!r.ok) {
      wrap.innerHTML = `<div class="alert error">${escapeHtml(r.error || 'خطا')}</div>`;
      return;
    }
    const releases = r.data.releases || [];
    if (releases.length === 0) {
      wrap.innerHTML = `<div class="card" style="text-align:center; padding: var(--sp-7); color: var(--muted);">هنوز نسخه‌ای آپلود نشده است.</div>`;
      return;
    }

    wrap.innerHTML = `<div class="release-list">` + releases.map((rel) => `
      <div class="release-item">
        <div class="release-item-main">
          <div class="release-item-head">
            <span class="release-item-version">v${escapeHtml(rel.version)}</span>
            ${rel.id === releases[0].id ? '<span class="badge success">آخرین</span>' : ''}
          </div>
          <div class="release-item-filename">${escapeHtml(rel.original_name)}</div>
          <div class="release-item-desc">${escapeHtml(rel.description || '')}</div>
          <div class="release-item-meta">
            <span>📅 ${formatDate(rel.created_at)}</span>
            <span>📏 ${formatBytes(rel.size)}</span>
          </div>
        </div>
        <button class="btn sm danger" data-del-id="${rel.id}">حذف</button>
      </div>
    `).join('') + `</div>`;

    // Wire up delete buttons
    wrap.querySelectorAll('[data-del-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.delId;
        if (!confirm('این نسخه حذف شود؟ فایل هم از دیسک پاک خواهد شد.')) return;
        btn.disabled = true;
        const r = await window.api.adminDeleteRelease(id);
        if (!r.ok) {
          alert('خطا: ' + (r.error || 'نامشخص'));
          btn.disabled = false;
          return;
        }
        loadReleases();
        loadStats();
      });
    });
  }

  // -------- Users table --------
  async function loadUsers() {
    const tbody = document.getElementById('usersTbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr class="empty-row"><td colspan="4">در حال بارگذاری...</td></tr>`;

    const r = await window.api.adminListUsers();
    if (!r.ok) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="4">خطا: ${escapeHtml(r.error || '')}</td></tr>`;
      return;
    }
    const users = r.data.users || [];
    if (users.length === 0) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="4">هنوز کاربری ثبت‌نام نکرده است.</td></tr>`;
      return;
    }

    tbody.innerHTML = users.map((u) => `
      <tr>
        <td>${escapeHtml(u.name)}${currentUser && u.id === currentUser.id ? '<span class="you-badge">شما</span>' : ''}</td>
        <td class="col-mono" dir="ltr">${escapeHtml(u.email)}</td>
        <td>${u.is_admin ? '<span class="admin-badge">مدیر</span>' : '<span class="badge">کاربر</span>'}</td>
        <td class="col-mono">${formatDate(u.created_at)}</td>
      </tr>
    `).join('');
  }

  // -------- Logout --------
  function wireUpLogout() {
    const btn = document.getElementById('btnLogout');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      await window.api.logout();
      window.location.href = '/login';
    });
  }

  // -------- Helpers --------
  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const u = ['B', 'KB', 'MB', 'GB', 'TB'];
    let v = bytes, i = 0;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return v.toFixed(v < 10 ? 1 : 0) + ' ' + u[i];
  }
  function formatDate(iso) {
    try {
      const d = new Date(iso + 'Z');
      return d.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return iso; }
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  // -------- Bootstrap --------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
