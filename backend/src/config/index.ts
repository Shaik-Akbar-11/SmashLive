export const config = {
  port:      process.env.PORT        || 5001,
  mongoUri:  process.env.MONGODB_URI || 'mongodb://localhost:27017/smashlive',
  jwtSecret: process.env.JWT_SECRET  || 'smash_secret_key_2024',
  jwtExpire: process.env.JWT_EXPIRE  || '24h',
};

export const validateConfig = (): void => {
  const isProd = process.env.NODE_ENV === 'production';
  const hasSmtp = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
  if (!hasSmtp && isProd) {
    console.warn('[Config] WARNING: SMTP_USER / SMTP_PASS not set — OTPs will only be logged to console.');
  }
};
