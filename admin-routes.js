/**
 * Admin routes (factory: takes (upload, ADMIN_EMAIL) and returns a router):
 *
 *   GET    /api/admin/users              → list all registered users
 *   GET    /api/admin/releases           → list all agent releases
 *   POST   /api/admin/upload             → multipart upload: file, version, description
 *   DELETE /api/admin/releases/:id       → delete a release (and its file on disk)
 *
 * All routes require admin auth (requireAdmin middleware).
 */
const express = require('express');
const path = require('path');
const fs = require('fs');

const { requireAdmin } = require('./middleware');
const { listUsers, listReleases, createRelease, deleteRelease, getRelease } = require('./db');

const UPLOADS_DIR = path.join(__dirname, 'uploads');

module.exports = function adminRoutes(upload, _adminEmail) {
  const router = express.Router();

  // All admin routes require admin auth
  router.use(requireAdmin);

  // ---------- GET /api/admin/users ----------
  router.get('/users', (_req, res) => {
    const users = listUsers();
    return res.json({ users });
  });

  // ---------- GET /api/admin/releases ----------
  router.get('/releases', (_req, res) => {
    const releases = listReleases();
    return res.json({ releases });
  });

  // ---------- POST /api/admin/upload ----------
  // multipart/form-data with fields:
  //   - file:        the installer file (binary)
  //   - version:     version string, e.g. "0.12.1"
  //   - description: release notes / description text
  router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded (field name must be "file")' });
    }
    const version = String(req.body.version || '').trim();
    const description = String(req.body.description || '').trim();
    if (!version) {
      // Clean up the uploaded file if validation fails
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(400).json({ error: 'Version is required' });
    }
    if (!description) {
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(400).json({ error: 'Description is required' });
    }

    const result = createRelease({
      version,
      description,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      uploadedBy: req.user.id,
    });

    return res.json({
      ok: true,
      id: result.lastInsertRowid,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
    });
  });

  // ---------- DELETE /api/admin/releases/:id ----------
  router.delete('/releases/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid release id' });
    const r = getRelease(id);
    if (!r) return res.status(404).json({ error: 'Release not found' });
    // Remove file from disk
    try {
      const fp = path.join(UPLOADS_DIR, r.filename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    } catch (e) {
      console.warn('Failed to delete release file:', e.message);
    }
    deleteRelease(id);
    return res.json({ ok: true });
  });

  return router;
};
