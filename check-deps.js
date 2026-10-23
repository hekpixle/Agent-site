/**
 * Pre-start dependency check.
 * Runs automatically before `npm start`, `npm run dev`, and `npm run watch`.
 * If node_modules is missing, prints a friendly message and exits.
 * If express is installed, we assume all deps are present (npm install is atomic).
 */
const fs = require('fs');
const path = require('path');

const nodeModulesDir = path.join(__dirname, 'node_modules');
const expressDir = path.join(nodeModulesDir, 'express');

if (!fs.existsSync(expressDir)) {
  console.error('');
  console.error('  ┌─────────────────────────────────────────────────────────┐');
  console.error('  │  وابستگی‌ها نصب نشده‌اند — Dependencies not installed    │');
  console.error('  ├─────────────────────────────────────────────────────────┤');
  console.error('  │  لطفاً اول این دستور را اجرا کنید:                        │');
  console.error('  │  Please run this command first:                         │');
  console.error('  │                                                         │');
  console.error('  │      npm install                                        │');
  console.error('  │                                                         │');
  console.error('  │  سپس دوباره تلاش کنید:                                   │');
  console.error('  │  Then try again:                                        │');
  console.error('  │      npm start       (production)                       │');
  console.error('  │      npm run dev     (no watch)                         │');
  console.error('  │      npm run watch   (with auto-reload)                 │');
  console.error('  └─────────────────────────────────────────────────────────┘');
  console.error('');
  process.exit(1);
}

// Check Node version — `node --watch` needs 18.11+
const nodeVersion = process.versions.node;
const [major, minor] = nodeVersion.split('.').map(Number);
if (major < 18 || (major === 18 && minor < 11)) {
  console.warn('');
  console.warn('  ⚠  هشدار: نسخه‌ی Node.js شما قدیمی است (' + nodeVersion + ')');
  console.warn('  ⚠  Warning: your Node.js version is old (' + nodeVersion + ')');
  console.warn('  ⚠  برای استفاده از `npm run watch` (auto-reload) به Node 18.11+ نیاز دارید.');
  console.warn('  ⚠  Node 18.11+ is required for `npm run watch` (auto-reload).');
  console.warn('  ⚠  `npm start` و `npm run dev` همچنان کار می‌کنند.');
  console.warn('  ⚠  `npm start` and `npm run dev` will still work.');
  console.warn('');
}
