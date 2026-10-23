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

module.exports = {
  getAdminEmail,
  isAdminEmail,
  hashPassword,
  verifyPassword,
  issueToken,
  verifyToken,
  COOKIE_NAME,
  JWT_SECRET,
};
