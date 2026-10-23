/**
 * Public agent routes:
 *  - GET /api/agent          → metadata about latest release (version, description, size)
 *  - GET /api/agent/download → streams the agent installer file to the browser
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const { getLatestRelease } = require('./db');

const UPLOADS_DIR = path.join(__dirname, 'uploads');

// ---------- GET /api/agent ----------
router.get('/', (_req, res) => {
  const r = getLatestRelease();
  if (!r) {
    return res.json({ available: false });
  }
  return res.json({
    available: true,
    id: r.id,
    version: r.version,
    description: r.description,
    filename: r.original_name,
    size: r.size,
    created_at: r.created_at,
    download_url: '/api/agent/download',
  });
});

// ---------- GET /api/agent/download ----------
router.get('/download', (_req, res) => {
  const r = getLatestRelease();
  if (!r) {
    return res.status(404).send('No agent release available yet.');
  }
  const filePath = path.join(UPLOADS_DIR, r.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Agent file not found on disk.');
  }
  // Force download with the original filename
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(r.original_name)}"`);
  res.setHeader('Content-Length', r.size);
  fs.createReadStream(filePath).pipe(res);
});

module.exports = router;
