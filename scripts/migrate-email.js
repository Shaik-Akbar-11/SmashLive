/**
 * Migration: add email field to existing users from provided CSV mapping.
 *
 * Usage:
 *   node scripts/migrate-email.js --dry-run          # inspect only, zero writes
 *   node scripts/migrate-email.js --mapping=map.csv  # apply with CSV
 *   node scripts/migrate-email.js                    # normalize existing emails only
 *
 * CSV format (mapping.csv):
 *   _id,email
 *   507f1f77bcf86cd799439011,user@example.com
 *
 * Safety guarantees:
 * - --dry-run modifies nothing
 * - Never deletes or recreates users
 * - Never overwrites a valid existing email without explicit flag --overwrite
 * - Idempotent: safe to run repeatedly
 * - Stops on first error and reports rollback steps
 */

'use strict';

const mongoose = require('mongoose');
const fs       = require('fs');
const path     = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
// Also try root .env
if (!process.env.MONGODB_URI) {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const args    = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const OVERWRITE = args.includes('--overwrite');
const mappingArg = args.find(a => a.startsWith('--mapping='));
const mappingFile = mappingArg ? mappingArg.split('=')[1] : null;

const normalizeEmail = (e) => String(e).trim().toLowerCase();

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('ERROR: MONGODB_URI not set. Provide it in backend/.env or .env');
    process.exit(1);
  }

  console.log(`\n=== SmashLive Email Migration ${DRY_RUN ? '[DRY RUN]' : '[LIVE]'} ===\n`);

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('Connected to MongoDB.');

  const db    = mongoose.connection.db;
  const users = db.collection('users');

  // ── Stats before ────────────────────────────────────────────────────────
  const total          = await users.countDocuments({});
  const withEmail      = await users.countDocuments({ email: { $exists: true, $ne: null, $ne: '' } });
  const withoutEmail   = total - withEmail;
  const admins         = await users.find({ role: 'admin' }).toArray();
  const adminsWithout  = admins.filter(u => !u.email || !u.email.trim());

  console.log(`Users before:       ${total}`);
  console.log(`With email:         ${withEmail}`);
  console.log(`Without email:      ${withoutEmail}`);
  console.log(`Total admins:       ${admins.length}`);
  console.log(`Admins without email: ${adminsWithout.length}`);
  if (adminsWithout.length > 0) {
    console.log('ADMINS WITHOUT EMAIL (must be resolved before cutover):');
    adminsWithout.forEach(u => console.log(`  _id=${u._id}  name=${u.name}  mobile=${u.mobile || '—'}`));
  }

  // ── Duplicate check ──────────────────────────────────────────────────────
  const dupes = await users.aggregate([
    { $match: { email: { $exists: true, $ne: null, $ne: '' } } },
    { $group: { _id: { $toLower: { $trim: { input: '$email' } } }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } },
  ]).toArray();

  if (dupes.length > 0) {
    console.log(`\nWARNING: ${dupes.length} duplicate normalized email(s) detected:`);
    dupes.forEach(d => console.log(`  email=${d._id}  count=${d.count}  ids=${JSON.stringify(d.ids)}`));
    console.log('Resolve duplicates manually before creating the unique index.\n');
  } else {
    console.log('No duplicate emails detected.');
  }

  // ── Load CSV mapping ─────────────────────────────────────────────────────
  const mapping = new Map(); // _id (string) -> normalized email
  if (mappingFile) {
    if (!fs.existsSync(mappingFile)) {
      console.error(`ERROR: Mapping file not found: ${mappingFile}`);
      process.exit(1);
    }
    const lines = fs.readFileSync(mappingFile, 'utf8').split('\n').map(l => l.trim()).filter(Boolean);
    // Skip header
    const start = lines[0].toLowerCase().startsWith('_id') ? 1 : 0;
    for (const line of lines.slice(start)) {
      const [id, email] = line.split(',').map(s => s.trim());
      if (!id || !email) continue;
      const norm = normalizeEmail(email);
      if (!EMAIL_RE.test(norm)) {
        console.warn(`  SKIP invalid email in CSV: id=${id} email=${email}`);
        continue;
      }
      mapping.set(id, norm);
    }
    console.log(`\nLoaded ${mapping.size} mappings from CSV.`);
  }

  // ── Process users ────────────────────────────────────────────────────────
  let migrated   = 0;
  let normalized = 0;
  let skipped    = 0;
  let errors     = 0;
  const unchanged = [];

  const cursor = users.find({});
  for await (const user of cursor) {
    const id = user._id.toString();

    try {
      // Case 1: user already has a valid email — normalize it
      if (user.email && user.email.trim()) {
        const norm = normalizeEmail(user.email);
        if (!EMAIL_RE.test(norm)) {
          console.warn(`  INVALID existing email: id=${id}  email=${user.email} — skipping`);
          unchanged.push({ id, reason: 'invalid existing email' });
          skipped++;
          continue;
        }
        if (norm !== user.email) {
          console.log(`  NORMALIZE id=${id}  "${user.email}" -> "${norm}"`);
          if (!DRY_RUN) {
            await users.updateOne({ _id: user._id }, { $set: { email: norm } });
          }
          normalized++;
        }
        continue;
      }

      // Case 2: no email — check mapping
      if (mapping.has(id)) {
        const newEmail = mapping.get(id);
        console.log(`  MIGRATE id=${id}  name="${user.name}"  email="${newEmail}"`);
        if (!DRY_RUN) {
          await users.updateOne(
            { _id: user._id },
            { $set: { email: newEmail } }
          );
        }
        migrated++;
        continue;
      }

      // Case 3: no email, no mapping
      unchanged.push({ id, name: user.name, mobile: user.mobile, role: user.role });
      skipped++;
    } catch (err) {
      console.error(`  ERROR id=${id}: ${err.message}`);
      errors++;
      if (!DRY_RUN) {
        console.error('\nMigration stopped after error. Rollback steps:');
        console.error('  1. Emails already written this run must be reviewed manually.');
        console.error('  2. Run with --dry-run to inspect current state.');
        console.error('  3. Do NOT create the unique index until all issues are resolved.');
        await mongoose.disconnect();
        process.exit(1);
      }
    }
  }

  // ── Stats after ──────────────────────────────────────────────────────────
  const totalAfter       = await users.countDocuments({});
  const withEmailAfter   = await users.countDocuments({ email: { $exists: true, $ne: null, $ne: '' } });
  const adminsAfter      = await users.find({ role: 'admin' }).toArray();
  const adminsWithEmail  = adminsAfter.filter(u => u.email && u.email.trim());

  console.log(`\n=== Results ===`);
  console.log(`Users before:            ${total}`);
  console.log(`Users after:             ${totalAfter}`);
  console.log(`Emails normalized:       ${normalized}`);
  console.log(`Users migrated (CSV):    ${migrated}`);
  console.log(`Users still without email: ${skipped}`);
  console.log(`Admins with email:       ${adminsWithEmail.length} / ${adminsAfter.length}`);
  console.log(`Errors:                  ${errors}`);

  if (unchanged.length > 0) {
    console.log(`\nUsers without email (cannot log in until mapped):`);
    unchanged.forEach(u => console.log(`  id=${u.id}  name=${u.name || '?'}  mobile=${u.mobile || '—'}  role=${u.role || '?'}`));
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No changes written. Re-run without --dry-run to apply.');
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
