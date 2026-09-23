import mongoose from 'mongoose';
import { config } from '../config';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Drop stale matchId unique index if it exists (causes duplicate key errors)
    try {
      await conn.connection.collection('matches').dropIndex('matchId_1');
      console.log('[DB] Dropped stale matchId_1 unique index');
    } catch {
      // Index doesn't exist — that's fine
    }
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
  }
};

export default connectDB;
