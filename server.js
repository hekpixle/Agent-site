/**
 * Hekpixle website — Express server entry.
 *
 * Routes:
 *   Public (no auth):
 *     GET  /                  landing page (3D hero + features + download CTA)
 *     GET  /login             login page
 *     GET  /register          register page
 *     GET  /api/agent         latest agent release info (metadata only)
 *     GET  /api/agent/download  download the latest agent installer
 *     POST /api/auth/register  { email, name, password }
 *     POST /api/auth/login     { email, password }
 *     POST /api/auth/logout
 *     GET  /api/auth/me        current user (or 401)
 *
 *   Admin only (is_admin = 1, set when email matches ADMIN_EMAIL env):
 *     GET  /admin              admin panel page
 *     GET  /api/admin/users    list all users
 *     GET  /api/admin/releases list all releases
 *     POST  /api/admin/upload   multipart: file + version + description
 *     DELETE /api/admin/releases/:id   delete a release
 */

// ---------- Load .env (optional — if dotenv isn't installed yet, skip) ----------
try { require('dotenv').config({ path: require('path').join(__dirname, '.env') }); } catch { /* .env not available — use process.env directly */ }

const path = require('path');
const fs = require('fs');

// ---------- Dependency check: give a friendly error if npm install wasn't run ----------
try {
  require.resolve('express');
} catch (e) {
  console.error('\n  ┌─────────────────────────────────────────────────────────┐');
  console.error('  │  خطا: وابستگی‌ها نصب نشده‌اند                              │');
  console.error('  │  Error: dependencies not installed                      │');
  console.error('  ├─────────────────────────────────────────────────────────┤');
  console.error('  │  لطفاً اول این دستور را اجرا کنید:                         │');
  console.error('  │  Please run this command first:                         │');
  console.error('  │                                                         │');
  console.error('  │      npm install                                        │');
  console.error('  │                                                         │');
  console.error('  │  سپس دوباره تلاش کنید:                                    │');
  console.error('  │  Then try again:                                        │');
  console.error('  │      npm start   (یا/npm run dev)                │');
  console.error('  └─────────────────────────────────────────────────────────┘\n');
  process.exit(1);
}

const express = require('express');
const cookieParser = require('cookie-parser');
const multer = require('multer');

const { COOKIE_NAME } = require('./auth-lib');
const { optionalAuth, requireAuth, requireAdmin } = require('./middleware');

const ADMIN_EMAIL = require('./auth-lib').getAdminEmail();
const ADMIN_SYNC = require('./auth-lib').syncAdminFromEnv();   // applies ADMIN_PASSWORD from .env
const PORT = parseInt(process.env.PORT || '3000', 10);
const MAX_UPLOAD_MB = parseInt(process.env.MAX_UPLOAD_MB || '200', 10);

const app = express();
app.disable('x-powered-by');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Trust proxy so secure cookies work behind a reverse proxy
app.set('trust proxy', 1);

// ---------- /admin route MUST be registered BEFORE static middleware ----------
// Otherwise express.static with `extensions: ['html']` serves admin.html to
// anyone who hits /admin, bypassing our auth check.
app.get('/admin', (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.redirect('/login?next=/admin');
  // Try to verify and load the user
  requireAuth(req, res, () => {
    if (!req.user.is_admin) return res.redirect('/');
    return res.sendFile(path.join(__dirname, 'admin.html'));
  });
});

// ---------- Static files ----------
// Everything now lives in ONE flat folder next to the server code, so we must
// NOT serve the whole folder (that would expose .env, server.js, the database…).
// Only this explicit allowlist is public. admin.html is intentionally absent:
// it is only served by the guarded /admin route above.
const PUBLIC_PAGES = ['index.html', 'login.html', 'register.html'];
const PUBLIC_ASSETS = [
  'tokens.css', 'base.css', 'landing.css', 'auth.css', 'admin.css',
  'theme.js', 'api.js', 'landing.js', 'auth-page.js', 'admin-page.js', 'three.min.js',
  'Vazirmatn-Regular.woff2', 'Vazirmatn-Medium.woff2', 'Vazirmatn-SemiBold.woff2', 'Vazirmatn-Bold.woff2',
  'SpaceGrotesk-Regular.woff2', 'SpaceGrotesk-Medium.woff2', 'SpaceGrotesk-SemiBold.woff2', 'SpaceGrotesk-Bold.woff2',
];
const sendPublic = (file, noCache) => (_req, res) => {
  // Don't cache HTML pages so auth changes are picked up immediately
  if (noCache) res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  res.sendFile(path.join(__dirname, file));
};
PUBLIC_PAGES.forEach((f) => {
  const name = f.replace(/\.html$/, '');
  app.get('/' + f, sendPublic(f, true));
  if (name !== 'index') app.get('/' + name, sendPublic(f, true));
});
PUBLIC_ASSETS.forEach((f) => app.get('/' + f, sendPublic(f, false)));

// ---------- File upload setup (multer) ----------
const UPLOADS_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    // Generate a unique filename to avoid collisions + path traversal
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    cb(null, safe);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    // Accept common installer / archive / executable extensions
    const ok = /\.(exe|msi|zip|7z|rar|tar|gz|pkg|dmg|deb|appimage)$/i.test(file.originalname);
    if (!ok) return cb(new Error('File type not allowed. Accepted: exe, msi, zip, 7z, rar, pkg, dmg, deb, appimage'));
    cb(null, true);
  },
});

// ---------- Routes ----------
const authRoutes = require('./auth-routes');
const agentRoutes = require('./agent-routes');
const adminRoutes = require('./admin-routes')(upload, ADMIN_EMAIL);

app.use('/api/auth', authRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/admin', adminRoutes);

// ---------- SPA-style fallback: serve index.html for unknown routes ----------
// (so client-side routing works if we add it later)
app.get('*', (req, res, next) => {
  // Don't intercept /api/* — those should 404 if not matched
  if (req.path.startsWith('/api/')) return next();
  // Don't intercept /admin — already handled above
  if (req.path === '/admin') return next();
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ---------- Centralized error handler ----------
app.use((err, _req, res, _next) => {
  console.error('[error]', err.message);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: 'Upload error: ' + err.message });
  }
  res.status(400).json({ error: err.message || 'Bad request' });
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║          Hekpixle website started            ║');
  console.log('  ╠══════════════════════════════════════════════╣');
  console.log(`  ║  URL:          http://localhost:${PORT.toString().padEnd(16)}║`);
  console.log(`  ║  Admin email:  ${ADMIN_EMAIL.padEnd(32)}║`);
  console.log(`  ║  Upload limit: ${MAX_UPLOAD_MB}MB${' '.repeat(31 - MAX_UPLOAD_MB.toString().length)}║`);
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log('');
  if (process.env.ADMIN_PASSWORD) console.log(`  Admin login → email: ${ADMIN_EMAIL} | password length read from .env: ${process.env.ADMIN_PASSWORD.length}`);
  if (ADMIN_SYNC === 'created')   console.log('  ✔ Admin account created from ADMIN_EMAIL / ADMIN_PASSWORD in .env');
  else if (ADMIN_SYNC === 'updated')  console.log('  ✔ Admin password updated from ADMIN_PASSWORD in .env');
  else if (ADMIN_SYNC === 'unchanged') console.log('  ✔ Admin account matches .env');
  else if (ADMIN_SYNC === 'invalid')  console.log('  ✖ ADMIN_PASSWORD must be at least 6 characters — ignored.');
  else console.log('  Admin: set ADMIN_PASSWORD in .env, or register with the admin email above.');
  console.log('  Forgot the password?  npm run create-admin -- you@example.com NewPassword');
  console.log('  To change the admin email, edit ADMIN_EMAIL in .env and restart.');
  console.log('');
});
