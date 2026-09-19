/**
 * Read-only stats script — modifies nothing.
 * Usage: node scripts/stats.js
 */

'use strict';

const mongoose = require('mongoose');
const path     = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
if (!process.env.MONGODB_URI) {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const db    = mongoose.connection.db;
  const users = db.collection('users');
  const otps  = db.collection('otps');

  const total        = await users.countDocuments({});
  const withEmail    = await users.countDocuments({ email: { $exists: true, $ne: null, $ne: '' } });
  const withMobile   = await users.countDocuments({ mobile: { $exists: true, $ne: null, $ne: '' } });
  const admins       = await users.find({ role: 'admin' }).toArray();
  const adminsNoEmail = admins.filter(u => !u.email || !u.email.trim());

  const dupes = await users.aggregate([
    { $match: { email: { $exists: true, $ne: null, $ne: '' } } },
    { $group: { _id: { $toLower: { $trim: { input: '$email' } } }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]).toArray();

  const userIndexes = await users.indexes();
  const otpIndexes  = await otps.indexes().catch(() => []);

  console.log('=== SmashLive DB Stats ===');
  console.log(`Total users:            ${total}`);
  console.log(`With email:             ${withEmail}`);
  console.log(`Without email:          ${total - withEmail}`);
  console.log(`With mobile:            ${withMobile}`);
  console.log(`Total admins:           ${admins.length}`);
  console.log(`Admins without email:   ${adminsNoEmail.length}`);
  if (adminsNoEmail.length) {
    adminsNoEmail.forEach(u => console.log(`  _id=${u._id}  name=${u.name}  mobile=${u.mobile || '—'}`));
  }
  console.log(`Duplicate emails:       ${dupes.length}`);
  console.log('\nUser indexes:');
  userIndexes.forEach(i => console.log(' ', JSON.stringify(i)));
  console.log('\nOtp indexes:');
  otpIndexes.forEach(i => console.log(' ', JSON.stringify(i)));

  await mongoose.disconnect();
}

main().catch(err => { console.error(err.message); process.exit(1); });
