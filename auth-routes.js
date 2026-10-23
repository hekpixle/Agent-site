/**
 * Auth routes: register, login, logout, me.
 * Admin status is granted at registration time if the email matches
 * ADMIN_EMAIL env var. This way the admin is just whoever signs up with
 * the configured admin email first.
 */
const express = require('express');
const router = express.Router();

const {
  hashPassword, verifyPassword, issueToken, verifyToken, COOKIE_NAME, isAdminEmail,
} = require('./auth-lib');
const { getUserByEmail, getUserById, createUser, updateUser } = require('./db');


const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days — matches JWT expiry
  });
}

// ---------- POST /api/auth/register ----------
router.post('/register', (req, res) => {
  const { email, name, password } = req.body || {};
  if (!email || !name || !password) {
    return res.status(400).json({ error: 'Email, name, and password are required' });
  }
  if (!EMAIL_RE.test(String(email))) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  if (getUserByEmail(email)) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  // Admin status: only if email matches ADMIN_EMAIL
  const isAdmin = isAdminEmail(email);

  const passwordHash = hashPassword(String(password));
  const result = createUser({ email, name, passwordHash, isAdmin });
  const user = getUserById(result.lastInsertRowid);

  const token = issueToken(user);
  setAuthCookie(res, token);

  return res.json({
    user: { id: user.id, email: user.email, name: user.name, is_admin: !!user.is_admin },
    redirect: isAdmin ? '/admin' : '/',
  });
});

// ---------- POST /api/auth/login ----------
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const user = getUserByEmail(email);
  if (!user || !verifyPassword(String(password), user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  // Promote automatically if this email is the configured admin email
  if (!user.is_admin && isAdminEmail(user.email)) {
    updateUser(user.id, { isAdmin: true });
    user.is_admin = 1;
  }
  const token = issueToken(user);
  setAuthCookie(res, token);
  return res.json({
    user: { id: user.id, email: user.email, name: user.name, is_admin: !!user.is_admin },
    redirect: user.is_admin ? '/admin' : '/',
  });
});

// ---------- POST /api/auth/logout ----------
router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

// ---------- GET /api/auth/me ----------
router.get('/me', (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid or expired session' });
  const user = getUserById(payload.sub);
  if (!user) return res.status(401).json({ error: 'User not found' });
  return res.json({
    user: { id: user.id, email: user.email, name: user.name, is_admin: !!user.is_admin },
  });
});

module.exports = router;
