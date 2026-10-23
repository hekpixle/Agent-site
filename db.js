/**
 * JSON file-based storage — replaces SQLite to avoid native module compilation.
 *
 * The data file lives at hekpixle.json and has this shape:
 * {
 *   users:    [ { id, email, name, password_hash, is_admin, created_at } ],
 *   releases: [ { id, version, description, filename, original_name, size, uploaded_by, created_at } ],
 *   _seq:     { users: <last user id>, releases: <last release id> }
 * }
 *
 * All writes are atomic (write to temp file, then rename).
 */
const path = require('path');
const fs = require('fs');

const DATA_DIR = __dirname;
fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'hekpixle.json');

// ---------- In-memory cache (loaded once, kept in sync) ----------
let _db = null;

function load() {
  if (_db) return _db;
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    _db = JSON.parse(raw);
    if (!_db.users)    _db.users = [];
    if (!_db.releases) _db.releases = [];
    if (!_db._seq)     _db._seq = { users: 0, releases: 0 };
  } catch {
    _db = { users: [], releases: [], _seq: { users: 0, releases: 0 } };
    save();
  }
  return _db;
}

function save() {
  const tmp = DB_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(_db, null, 2), 'utf8');
  fs.renameSync(tmp, DB_PATH);  // atomic on most filesystems
}

function nextId(table) {
  const db = load();
  db._seq[table] = (db._seq[table] || 0) + 1;
  return db._seq[table];
}

// ---------- Users ----------
module.exports = {
  // User helpers
  getUserByEmail: (email) => {
    const db = load();
    const e = String(email || '').toLowerCase().trim();
    return db.users.find((u) => u.email === e) || null;
  },
  getUserById: (id) => {
    const db = load();
    return db.users.find((u) => u.id === id) || null;
  },
  createUser: ({ email, name, passwordHash, isAdmin }) => {
    const db = load();
    const id = nextId('users');
    const user = {
      id,
      email: String(email).toLowerCase().trim(),
      name,
      password_hash: passwordHash,
      is_admin: isAdmin ? 1 : 0,
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    db.users.push(user);
    save();
    // Return the public-safe version (no password_hash)
    const { password_hash, ...safe } = user;
    return { lastInsertRowid: id, _safe: safe };
  },
  // Update fields of an existing user (passwordHash / isAdmin / name)
  updateUser: (id, { passwordHash, isAdmin, name }) => {
    const db = load();
    const u = db.users.find((x) => x.id === id);
    if (!u) return null;
    if (passwordHash !== undefined) u.password_hash = passwordHash;
    if (isAdmin !== undefined) u.is_admin = isAdmin ? 1 : 0;
    if (name !== undefined) u.name = name;
    save();
    return u;
  },
  listUsers: () => {
    const db = load();
    return db.users.map(({ password_hash, ...u }) => u);
  },
  countUsers: () => load().users.length,

  // Agent release helpers
  getLatestRelease: () => {
    const db = load();
    if (!db.releases.length) return null;
    // Releases are pushed in order, so the last one is the latest
    return db.releases[db.releases.length - 1];
  },
  getRelease: (id) => {
    const db = load();
    return db.releases.find((r) => r.id === id) || null;
  },
  listReleases: () => {
    const db = load();
    // Return in reverse order (newest first)
    return db.releases.slice().reverse();
  },
  createRelease: ({ version, description, filename, originalName, size, uploadedBy }) => {
    const db = load();
    const id = nextId('releases');
    const release = {
      id,
      version,
      description,
      filename,
      original_name: originalName,
      size,
      uploaded_by: uploadedBy,
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    db.releases.push(release);
    save();
    return { lastInsertRowid: id };
  },
  deleteRelease: (id) => {
    const db = load();
    const idx = db.releases.findIndex((r) => r.id === id);
    if (idx === -1) return { changes: 0 };
    db.releases.splice(idx, 1);
    save();
    return { changes: 1 };
  },
};
