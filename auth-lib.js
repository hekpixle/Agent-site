/**
 * Auth helpers: password hashing (bcrypt) + JWT issue/verify.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = '7d';
const COOKIE_NAME = 'hek_token';

// Admin email is read at call time so it always reflects the current .env
function getAdminEmail() {
  return (process.env.ADMIN_EMAIL || 'admin@hekpixle.ir').toLowerCase().trim();
}

function isAdminEmail(email) {
  return String(email || '').toLowerCase().trim() === getAdminEmail();
}

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

function verifyPassword(plain, hash) {
  try { return bcrypt.compareSync(plain, hash); }
  catch { return false; }
}

function issueToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name, is_admin: !!user.is_admin },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); }
  catch { return null; }
}

/**
 * Make the admin account match ADMIN_EMAIL / ADMIN_PASSWORD from .env.
 * Called once at server start (after .env is loaded):
 *  - ADMIN_PASSWORD empty  → does nothing (old behaviour: register with ADMIN_EMAIL)
 *  - admin doesn't exist   → created
 *  - exists, other password→ password updated + promoted to admin
 *  - exists, same password → nothing is written
 * Returns 'skipped' | 'invalid' | 'created' | 'updated' | 'unchanged'.
 */
function syncAdminFromEnv() {
  const password = process.env.ADMIN_PASSWORD || '';
  if (!password) return 'skipped';
  if (password.length < 6) return 'invalid';

  const { getUserByEmail, createUser, updateUser } = require('./db');
  const email = getAdminEmail();
  const existing = getUserByEmail(email);

  if (!existing) {
    createUser({ email, name: 'Admin', passwordHash: hashPassword(password), isAdmin: true });
    return 'created';
  }
  if (verifyPassword(password, existing.password_hash) && existing.is_admin) return 'unchanged';
  updateUser(existing.id, { passwordHash: hashPassword(password), isAdmin: true });
  return 'updated';
}

/**
 * Lets you set the admin email/password right from the start command:
 *   npm start -- you@example.com NewPassword123
 * (also works with `npm run dev --` and `npm run watch --`).
 * It overrides ADMIN_EMAIL / ADMIN_PASSWORD from .env for this run, and
 * syncAdminFromEnv() then saves the new password to the database.
 * Returns true if CLI credentials were applied.
 */
function applyCliAdminArgs(argv) {
  const args = (argv || []).slice(2);
  if (args.length >= 2 && String(args[0]).includes('@')) {
    process.env.ADMIN_EMAIL = args[0];
    process.env.ADMIN_PASSWORD = args[1];
    return true;
  }
  return false;
}

module.exports = {
  applyCliAdminArgs,
  syncAdminFromEnv,
  getAdminEmail,
  isAdminEmail,
  hashPassword,
  verifyPassword,
  issueToken,
  verifyToken,
  COOKIE_NAME,
  JWT_SECRET,
};
