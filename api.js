/* ============================================================================
   API client — thin wrapper around fetch() that:
   - sends JSON
   - includes credentials (cookies) for auth
   - returns { ok, data, error }
   ============================================================================ */
window.api = (function () {
  async function request(method, url, body, opts) {
    const options = Object.assign({
      method,
      credentials: 'same-origin',  // send cookies
      headers: {},
    }, opts || {});

    if (body !== undefined && body !== null) {
      if (body instanceof FormData) {
        options.body = body;  // browser sets multipart boundary
      } else {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
      }
    }

    let res;
    try {
      res = await fetch(url, options);
    } catch (e) {
      return { ok: false, error: 'Network error: ' + (e.message || e) };
    }

    let data = null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      try { data = await res.json(); } catch {}
    } else if (res.status !== 204) {
      try { data = await res.text(); } catch {}
    }

    if (!res.ok) {
      const errMsg = (data && data.error) || (typeof data === 'string' ? data : null) || ('HTTP ' + res.status);
      return { ok: false, error: errMsg, status: res.status, data };
    }

    return { ok: true, data, status: res.status };
  }

  return {
    get:    (url, opts)       => request('GET',    url, null, opts),
    post:   (url, body, opts) => request('POST',   url, body, opts),
    put:    (url, body, opts) => request('PUT',    url, body, opts),
    del:    (url, opts)       => request('DELETE', url, null, opts),

    // ---- Auth helpers ----
    register: (email, name, password) =>
      request('POST', '/api/auth/register', { email, name, password }),
    login: (email, password) =>
      request('POST', '/api/auth/login', { email, password }),
    logout: () => request('POST', '/api/auth/logout'),
    me:     () => request('GET', '/api/auth/me'),

    // ---- Public agent info ----
    getAgent: () => request('GET', '/api/agent'),

    // ---- Admin ----
    adminListUsers:     ()        => request('GET', '/api/admin/users'),
    adminListReleases:  ()        => request('GET', '/api/admin/releases'),
    adminDeleteRelease: (id)      => request('DELETE', '/api/admin/releases/' + encodeURIComponent(id)),
    adminUpload:        (formData) => request('POST', '/api/admin/upload', formData),
  };
})();
