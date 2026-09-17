
import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import { initWhatsApp } from './services/whatsapp.service';
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
import { config } from './config';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:8080',
      'http://localhost:3000',
      process.env.FRONTEND_URL || '',
    ].filter(Boolean),
    credentials: true,
  },
});

// Middlewares
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:3000',
    process.env.FRONTEND_URL || '',
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json());

// Database
connectDB();

// OTP sender
initWhatsApp();

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});
app.get('/', (_req, res) => res.json({ status: 'SmashLive API running' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/entities', entityRoutes);

app.set('io', io);

// Socket Logic
initMatchSockets(io);

app.use(notFound);
app.use(errorHandler);

httpServer.listen(config.port, () => {
  console.log(`🚀 SmashLive Backend running on port ${config.port}`);
});