import mongoose, { Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IOtp extends Document {
  email: string;
  otpHash: string;
  expiresAt: Date;
  verified: boolean;
  attempts: number;
  createdAt: Date;
  verifyOtp(enteredOtp: string): Promise<boolean>;
}

const otpSchema = new mongoose.Schema<IOtp>(
  {
    email:     { type: String, required: true, lowercase: true, trim: true },
    otpHash:   { type: String, required: true },
    expiresAt: { type: Date, required: true },
    verified:  { type: Boolean, default: false },
    attempts:  { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Auto-delete expired documents via MongoDB TTL index
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Fast lookup by email when verifying
otpSchema.index({ email: 1 });

otpSchema.methods.verifyOtp = async function (enteredOtp: string): Promise<boolean> {
  return bcrypt.compare(enteredOtp, this.otpHash);
};

export const Otp = mongoose.model<IOtp>('Otp', otpSchema);
