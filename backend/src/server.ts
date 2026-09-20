import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import connectDB from './database/connection';
import authRoutes from './routes/auth.routes';
import playerRoutes from './routes/player.routes';
import tournamentRoutes from './routes/tournament.routes';
import matchRoutes from './routes/match.routes';
import userRoutes from './routes/user.routes';
import analyticsRoutes from './routes/analytics.routes';
import entityRoutes from './routes/entity.routes';
import { notFound, errorHandler } from './middlewares/error.middleware';
import { initMatchSockets } from './sockets/match.socket';
import { config, validateConfig } from './config';
import { setEmailProvider } from './services/otp.service';
import { ResendEmailProvider, GmailSmtpProvider } from './services/email.provider';
import type { EmailProvider } from './services/email.provider';

// ── Startup validation ───────────────────────────────────────────────────────
validateConfig();

// ── Wire email provider ──────────────────────────────────────────────────────
let provider: EmailProvider;

const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = parseInt(process.env.SMTP_PORT || '587');
const emailFrom = process.env.EMAIL_FROM || smtpUser || '';

if (smtpUser && smtpPass) {
  // Gmail SMTP takes priority when credentials are set
  provider = new GmailSmtpProvider(smtpHost, smtpPort, smtpUser, smtpPass, emailFrom, 10);
  console.log('[Email] Gmail SMTP provider ready.');
} else if (config.resendApiKey && config.emailFrom) {
  provider = new ResendEmailProvider(config.resendApiKey, config.emailFrom, 10);
  console.log('[Email] Resend email provider ready.');
} else {
  provider = {
    async sendOtpEmail(email: string, otp: string) {
      console.log(`[DEV] OTP for ${email}: ${otp}`);
    },
  };
  console.warn('[Email] No email config — using console OTP logging (dev only).');
}

setEmailProvider(provider);

// ── Express + Socket.IO ──────────────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  // Production Vercel frontend — always allowed
  'https://smash-live.vercel.app',
  // Local development
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3000',
  // Optional override via Render env var (additional origin, e.g. custom domain)
  process.env.FRONTEND_URL || '',
].filter(Boolean);

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, credentials: true },
});

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

connectDB();

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});
app.get('/', (_req, res) => res.json({ status: 'SmashLive API running' }));

// API Routes
app.use('/api/auth',        authRoutes);
app.use('/api/players',     playerRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/matches',     matchRoutes);
app.use('/api/users',       userRoutes);
app.use('/api/analytics',   analyticsRoutes);
app.use('/api/entities',    entityRoutes);

app.set('io', io);

initMatchSockets(io);

app.use(notFound);
app.use(errorHandler);

httpServer.listen(config.port, () => {
  console.log(`🚀 SmashLive Backend running on port ${config.port}`);
});
