export const config = {
  port:      process.env.PORT        || 5001,
  mongoUri:  process.env.MONGODB_URI || 'mongodb://localhost:27017/smashlive',
  jwtSecret: process.env.JWT_SECRET  || 'smash_secret_key_2024',
  jwtExpire: process.env.JWT_EXPIRE  || '24h',
};

export const validateConfig = (): void => {
  // Resend is the only email provider — no SMTP needed
};
