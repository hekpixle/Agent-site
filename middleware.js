/**
 * Auth middleware:
 *  - requireAuth:  user must be logged in (any registered user)
 *  - requireAdmin: user must be logged in AND have is_admin flag
 *                  (admin status is determined by email match at registration
 *                   time, stored in users.is_admin column)
 */
const { verifyToken, COOKIE_NAME, isAdminEmail } = require('./auth-lib');
const { getUserById, updateUser } = require('./db');

// If the user's email matches ADMIN_EMAIL but they were registered before it
// was set (is_admin = 0), promote them automatically.
function syncAdmin(user) {
  if (user && !user.is_admin && isAdminEmail(user.email)) {
    updateUser(user.id, { isAdmin: true });
    user.is_admin = 1;
  }
  return user;
}

function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid or expired session' });
  // Refresh user from DB so role changes (e.g. admin promotion) take effect
  const user = getUserById(payload.sub);
  if (!user) return res.status(401).json({ error: 'User not found' });
  req.user = syncAdmin(user);
  next();
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

// Optional auth — sets req.user if logged in, but doesn't reject otherwise
function optionalAuth(req, _res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      const user = getUserById(payload.sub);
      if (user) req.user = syncAdmin(user);
    }
  }
  next();
}

module.exports = { requireAuth, requireAdmin, optionalAuth };
