/**
 * One-time migration: update all users with non-SMA smash IDs to new format
 * Run: npx ts-node src/scripts/migrate-smash-ids.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/User';

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smashlive');
  console.log('Connected to MongoDB');

  const users = await User.find({}).lean();
  const year = new Date().getFullYear().toString().slice(-2);
  let updated = 0;

  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    const id = u.smashId || '';
    // Update if no smashId or doesn't start with SMA
    if (!id || !id.startsWith('SMA')) {
      const seq = String(i + 1).padStart(4, '0');
      const newId = `SMA${year}${seq}`;
      await User.findByIdAndUpdate(u._id, { smashId: newId });
      console.log(`Updated ${u.name}: ${id || 'none'} → ${newId}`);
      updated++;
    }
  }

  console.log(`\nMigration complete. Updated ${updated} users.`);
  await mongoose.disconnect();
}

migrate().catch(console.error);
