/**
 * OTP service — keyed by normalized email.
 *
 * Security properties preserved from the original whatsapp.service:
 * - Cryptographically random 6-digit OTP (crypto.randomInt)
 * - bcrypt hash storage — plain OTP is never persisted
 * - 10-minute expiry enforced by DB TTL index
 * - One-time use: marked verified on first successful check
 * - New OTP invalidates the previous one (deleteMany before create)
 * - Max attempts per OTP document
 * - Plain OTP is never logged, returned, or exposed
 *
 * New additions:
 * - Resend cooldown (60 s) enforced before generating a new OTP
 * - Max attempts (5) before OTP is invalidated
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Otp } from '../models/Otp';
import type { EmailProvider } from './email.provider';

const OTP_TTL_MS      = 10 * 60 * 1000;  // 10 minutes
const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS    = 5;
const RESEND_COOLDOWN = 60 * 1000;        // 60 seconds

/** Trim + lowercase. Applied on both send and verify. */
export const normalizeEmail = (email: string): string =>
  String(email).trim().toLowerCase();

let emailProvider: EmailProvider | null = null;

export const setEmailProvider = (provider: EmailProvider): void => {
  emailProvider = provider;
};

export const getOtpTtlMinutes = (): number => OTP_TTL_MINUTES;

/**
 * Generate and send a new OTP to the given email.
 * Returns identical response shape regardless of whether the email is known.
 */
export const sendOtp = async (rawEmail: string): Promise<void> => {
  if (!emailProvider) {
    throw new Error('Email provider not initialised');
  }

  const email = normalizeEmail(rawEmail);

  // Resend cooldown — check if a recent OTP was already sent
  const existing = await Otp.findOne({ email, verified: false });
  if (existing) {
    const age = Date.now() - existing.createdAt!.getTime();
    if (age < RESEND_COOLDOWN) {
      throw new Error('Please wait before requesting another OTP.');
    }
    // Invalidate the old OTP before issuing a new one
    await Otp.deleteMany({ email });
  }

  // Generate secure random 6-digit OTP
  const otp     = crypto.randomInt(100_000, 1_000_000).toString();
  const otpHash = await bcrypt.hash(otp, 10);

  await Otp.create({
    email,
    otpHash,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    verified:  false,
    attempts:  0,
  });

  // Provider failure surfaces as "Unable to send OTP. Please try again."
  // Technical details are logged inside the provider — never the OTP itself
  await emailProvider.sendOtpEmail(email, otp);
};

/**
 * Verify the OTP submitted by the user.
 * Throws with canonical messages on failure.
 */
export const verifyOtp = async (rawEmail: string, otp: string): Promise<boolean> => {
  const email = normalizeEmail(rawEmail);

  const record = await Otp.findOne({
    email,
    verified:  false,
    expiresAt: { $gt: new Date() },
  });

  if (!record) {
    throw new Error('Invalid or expired OTP.');
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await Otp.deleteMany({ email });
    throw new Error('Too many attempts. Please try again later.');
  }

  // Increment attempt counter before checking (prevents timing-based enumeration)
  record.attempts += 1;
  await record.save();

  const isMatch = await record.verifyOtp(otp);
  if (!isMatch) {
    throw new Error('Invalid or expired OTP.');
  }

  // Mark as used — single use, cannot be replayed
  record.verified = true;
  await record.save();

  return true;
};
