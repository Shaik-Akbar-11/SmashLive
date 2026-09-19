export const config = {
  port:      process.env.PORT        || 5001,
  mongoUri:  process.env.MONGODB_URI || 'mongodb://localhost:27017/smashlive',
  jwtSecret: process.env.JWT_SECRET  || 'smash_secret_key_2024',
  jwtExpire: process.env.JWT_EXPIRE  || '24h',

  // Gmail SMTP — OTP delivery
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: parseInt(process.env.SMTP_PORT || '465', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',    // never logged
  emailFrom: process.env.EMAIL_FROM || '',
};

/**
 * Called once at startup.
 * In production the server refuses to start if SMTP config is missing.
 * In development it falls back to console-logging the OTP.
 */
export const validateConfig = (): void => {
  const isProd = process.env.NODE_ENV === 'production';
  const missing = !config.smtpUser || !config.smtpPass || !config.emailFrom;

  if (missing && isProd) {
    console.error('[Config] FATAL: SMTP_USER, SMTP_PASS, and EMAIL_FROM are required in production.');
    process.exit(1);
  }

  if (missing) {
    console.warn('[Config] WARNING: SMTP_USER / SMTP_PASS / EMAIL_FROM not set — OTPs will be logged to console (dev only).');
  }
};
