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
import searchRoutes from './routes/search.routes';
import { notFound, errorHandler } from './middlewares/error.middleware';
import { initMatchSockets } from './sockets/match.socket';
import { config, validateConfig } from './config';
import { setEmailProvider } from './services/otp.service';
import { BrevoEmailProvider } from './services/email.provider';
import type { EmailProvider } from './services/email.provider';
import { startMatchReminderJob, setReminderEmailProvider } from './services/match-reminder.service';
import { setTournamentIo } from './services/tournament.service';
import { startRegistrationDeadlineJob } from './services/registration-deadline.service';
// ── Startup validation ───────────────────────────────────────────────────────
validateConfig();

// ── Wire email provider ──────────────────────────────────────────────────────
let provider: EmailProvider;

const brevoApiKey = process.env.BREVO_API_KEY || '';
const emailFrom   = process.env.EMAIL_FROM    || 'smashliveofficial@gmail.com';

if (brevoApiKey) {
  provider = new BrevoEmailProvider(brevoApiKey, emailFrom, 'SmashLive', 10);
  console.log(`[Email] Brevo HTTP API ready — from ${emailFrom}`);
} else {
  provider = {
    async sendOtpEmail(email: string, otp: string) {
      console.log(`[DEV] OTP for ${email}: ${otp}`);
    },
    async sendEmail(email: string, subject: string, _html: string) {
      console.log(`[DEV] Email to ${email}: ${subject}`);
    },
  };
  console.warn('[Email] No BREVO_API_KEY — OTPs logged to console only.');
}

setEmailProvider(provider);
setReminderEmailProvider(provider);

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

// Start match reminder job after io is created
startMatchReminderJob(io);

// Auto-close tournament registrations when deadline passes
startRegistrationDeadlineJob();

// GET /health
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    emailProvider: process.env.BREVO_API_KEY ? 'brevo' : 'console',
    emailFrom: process.env.EMAIL_FROM || 'not set',
  });
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
app.use('/api/search',      searchRoutes);

app.set('io', io);

initMatchSockets(io);
setTournamentIo(io);

app.use(notFound);
app.use(errorHandler);

httpServer.listen(config.port, () => {
  console.log(`🚀 SmashLive Backend running on port ${config.port}`);
});
