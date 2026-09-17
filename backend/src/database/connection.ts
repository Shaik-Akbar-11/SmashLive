import mongoose from 'mongoose';
import { config } from '../config';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    // Don't exit — let the server run, DB-dependent routes will fail gracefully
  }
};

export default connectDB;