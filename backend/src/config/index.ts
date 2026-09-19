export const config = {
  port:      process.env.PORT        || 5001,
  mongoUri:  process.env.MONGODB_URI || 'mongodb://localhost:27017/smashlive',
  jwtSecret: process.env.JWT_SECRET  || 'smash_secret_key_2024',
  jwtExpire: process.env.JWT_EXPIRE  || '24h',

  // Email / OTP delivery — reads RESEND_API_KEY and EMAIL_FROM from environment
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom:    process.env.EMAIL_FROM     || '',
};

/**
 * Called once at startup.
 * In production the server refuses to start if Resend config is missing.
 * In development it falls back to console-logging the OTP.
 */
export const validateConfig = (): void => {
  const isProd = process.env.NODE_ENV === 'production';
  const missing = !config.resendApiKey || !config.emailFrom;

  if (missing && isProd) {
    console.error('[Config] FATAL: RESEND_API_KEY and EMAIL_FROM are required in production.');
    process.exit(1);
  }

  if (missing) {
    console.warn('[Config] WARNING: RESEND_API_KEY / EMAIL_FROM not set — OTPs will be logged to console (dev only).');
  }
};
