/**
 * Index management script.
 * Usage:
 *   node scripts/indexes.js record    # print current indexes (read-only)
 *   node scripts/indexes.js apply     # create new indexes, convert mobile to non-unique
 *   node scripts/indexes.js rollback  # restore pre-migration indexes
 */

'use strict';

const mongoose = require('mongoose');
const path     = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
if (!process.env.MONGODB_URI) {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
}

const action = process.argv[2];
if (!['record', 'apply', 'rollback'].includes(action)) {
  console.error('Usage: node scripts/indexes.js [record|apply|rollback]');
  process.exit(1);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const db    = mongoose.connection.db;
  const users = db.collection('users');
  const otps  = db.collection('otps');

  if (action === 'record') {
    console.log('\n=== Current indexes ===');
    console.log('\nusers:');
    (await users.indexes()).forEach(i => console.log(' ', JSON.stringify(i)));
    console.log('\notps:');
    (await otps.indexes().catch(() => [])).forEach(i => console.log(' ', JSON.stringify(i)));

  } else if (action === 'apply') {
    console.log('Applying index changes...');

    // 1. Drop old sparse non-unique email index (if it exists)
    const existingIndexes = await users.indexes();
    const emailIdx = existingIndexes.find(i => i.key && i.key.email === 1 && !i.unique);
    if (emailIdx) {
      console.log(`  Dropping old sparse email index: ${emailIdx.name}`);
      await users.dropIndex(emailIdx.name);
    }

    // 2. Create partial unique email index
    console.log('  Creating partial unique email index...');
    await users.createIndex(
      { email: 1 },
      {
        unique: true,
        partialFilterExpression: { email: { $type: 'string' } },
        name: 'email_partial_unique',
      }
    );

    // 3. Convert mobile from unique to plain index
    const mobileIdx = existingIndexes.find(i => i.key && i.key.mobile === 1 && i.unique);
    if (mobileIdx) {
      console.log(`  Dropping unique mobile index: ${mobileIdx.name}`);
      await users.dropIndex(mobileIdx.name);
      console.log('  Creating plain mobile index...');
      await users.createIndex({ mobile: 1 }, { name: 'mobile_1' });
    } else {
      console.log('  No unique mobile index found — ensuring plain mobile index exists...');
      await users.createIndex({ mobile: 1 }, { name: 'mobile_1' }).catch(() => {});
    }

    console.log('Done. Verify with: node scripts/indexes.js record');

  } else if (action === 'rollback') {
    console.log('Rolling back index changes...');

    // 1. Drop partial unique email index
    await users.dropIndex('email_partial_unique').catch(() => console.log('  email_partial_unique not found (ok)'));

    // 2. Restore sparse non-unique email index
    await users.createIndex({ email: 1 }, { sparse: true, name: 'email_1' });

    // 3. Drop plain mobile index and restore unique one
    await users.dropIndex('mobile_1').catch(() => {});
    await users.createIndex({ mobile: 1 }, { unique: true, name: 'mobile_1' });

    console.log('Rollback complete. Verify with: node scripts/indexes.js record');
  }

  await mongoose.disconnect();
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
