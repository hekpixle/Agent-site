/**
 * Create an admin account, or reset the password of an existing one.
 *
 *   npm run create-admin -- you@example.com YourNewPassword
 *   npm run create-admin -- you@example.com YourNewPassword "Your Name"
 *
 * If email/password are omitted, ADMIN_EMAIL from .env is used and you must
 * pass the password. Works even if the user already registered before.
 */
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '.env') }); } catch {}

const { hashPassword, getAdminEmail } = require('./auth-lib');
const { getUserByEmail, createUser, updateUser } = require('./db');

const args = process.argv.slice(2);
let email, password, name;
if (args.length >= 2 && args[0].includes('@')) {
  [email, password, name] = args;
} else {
  email = getAdminEmail();
  password = args[0];
}

if (!email || !password) {
  console.error('\n  Usage: npm run create-admin -- <email> <password> [name]');
  console.error('  مثال:  npm run create-admin -- you@example.com MyPass123\n');
  process.exit(1);
}
if (password.length < 6) {
  console.error('\n  Password must be at least 6 characters / رمز حداقل ۶ کاراکتر\n');
  process.exit(1);
}

const hash = hashPassword(password);
const existing = getUserByEmail(email);

if (existing) {
  updateUser(existing.id, { passwordHash: hash, isAdmin: true });
  console.log(`\n  ✔ Existing user updated: ${existing.email} is now ADMIN with the new password.\n`);
} else {
  createUser({ email, name: name || 'Admin', passwordHash: hash, isAdmin: true });
  console.log(`\n  ✔ Admin created: ${email.toLowerCase().trim()}\n`);
}
console.log('  Login at: http://localhost:' + (process.env.PORT || 3000) + '/login\n');
