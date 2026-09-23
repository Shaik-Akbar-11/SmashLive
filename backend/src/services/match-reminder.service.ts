/**
 * Match reminder service.
 * Runs every 5 minutes and sends email notifications to players
 * whose matches are starting within 30 minutes.
 */

import { Match } from '../models/Match';
import { User } from '../models/User';
import type { EmailProvider } from './email.provider';
import type { Server } from 'socket.io';

const REMIND_30_MS = 30 * 60 * 1000;
const REMIND_5_MS  = 5  * 60 * 1000;
const CHECK_INTERVAL = 2 * 60 * 1000; // check every 2 min

const reminded30 = new Set<string>();
const reminded5  = new Set<string>();
let emailProvider: EmailProvider | null = null;
let ioServer: Server | null = null;

export function setReminderEmailProvider(p: EmailProvider) {
  emailProvider = p;
}

export function setReminderIo(io: Server) {
  ioServer = io;
}

function buildReminderHtml(playerName: string, matchName: string, opponent: string, scheduledAt: Date, venue?: string): string {
  const timeStr = scheduledAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = scheduledAt.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:32px;margin:0">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border-top:4px solid #0EA5E9">
    <div style="margin-bottom:20px">
      <span style="font-size:22px;font-weight:900;color:#0B1F3A">Smash<span style="color:#0EA5E9">Live</span></span>
    </div>
    <h2 style="color:#0B1F3A;margin:0 0 8px 0;font-size:20px">🏸 Match Starting Soon!</h2>
    <p style="color:#555;margin:0 0 20px 0;font-size:14px">Hey <strong>${playerName}</strong>, your match starts in 30 minutes.</p>
    <div style="background:#F0F9FF;border:2px solid #0EA5E9;border-radius:12px;padding:20px;margin-bottom:20px">
      <p style="margin:0 0 6px 0;font-size:12px;color:#0B1F3A;font-weight:700;text-transform:uppercase">Match Details</p>
      <p style="margin:4px 0;font-size:16px;font-weight:900;color:#0B1F3A">${matchName}</p>
      <p style="margin:4px 0;font-size:13px;color:#555">vs <strong>${opponent}</strong></p>
      <p style="margin:8px 0 4px 0;font-size:12px;color:#0EA5E9;font-weight:700">⏰ ${timeStr} · ${dateStr}</p>
      ${venue ? `<p style="margin:4px 0;font-size:12px;color:#777">📍 ${venue}</p>` : ''}
    </div>
    <p style="color:#aaa;font-size:12px;margin:0">Warm up and get ready! Good luck 🏆</p>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
    <p style="color:#aaa;font-size:11px;margin:0;text-align:center">© SmashLive — The Badminton Network</p>
  </div>
</body>
</html>`;
}

async function notifyPlayer(email: string, playerName: string, matchName: string, opponent: string, scheduledAt: Date, venue?: string) {
  if (!emailProvider || !email) return;
  const subject = `🏸 Your match "${matchName}" starts in 30 minutes!`;
  const html = buildReminderHtml(playerName, matchName, opponent, scheduledAt, venue);
  try {
    await emailProvider.sendEmail(email, subject, html);
    console.log(`[Reminder] Notified ${playerName} <${email}>`);
  } catch (err: any) {
    console.error(`[Reminder] Failed to notify ${email}:`, err?.message);
  }
}

async function checkAndNotify() {
  try {
    const now = new Date();

    // Check for both 30-min and 5-min windows
    const windows = [
      { ms: REMIND_30_MS, set: reminded30, label: '30 minutes' },
      { ms: REMIND_5_MS,  set: reminded5,  label: '5 minutes'  },
    ];

    for (const { ms, set, label } of windows) {
      const windowEnd   = new Date(now.getTime() + ms);
      const windowStart = new Date(windowEnd.getTime() - CHECK_INTERVAL);

      const upcoming = await Match.find({
        status:      'scheduled',
        scheduledAt: { $gte: windowStart, $lte: windowEnd },
      }).lean();

      for (const match of upcoming) {
        const key = `${match._id}_${ms}`;
        if (set.has(key)) continue;
        set.add(key);

        const p = (match as any).players || {};
        const venue = (match as any).toss?.venue || (match as any).toss?.city || '';
        const scheduledAt = (match as any).scheduledAt as Date;
        const matchName = (match as any).name || 'Match';
        const matchId = String(match._id);

        const p1Name = p.p1?.name || p.sideA?.[0]?.name || 'Athlete A';
        const p2Name = p.p2?.name || p.sideB?.[0]?.name || 'Athlete B';

        // Find player emails
        const users = await User.find({
          name: { $in: [p1Name, p2Name] }
        }).lean();
        const emailByName: Record<string, string> = {};
        const idByName: Record<string, string> = {};
        users.forEach(u => {
          if (u.email) emailByName[u.name.toLowerCase()] = u.email;
          idByName[u.name.toLowerCase()] = String(u._id);
        });

        // In-app notification via Socket.IO to each player
        if (ioServer) {
          const notifPayload = {
            type: 'match_reminder',
            matchId,
            matchName,
            venue,
            scheduledAt,
            minutesBefore: ms / 60000,
          };
          // Broadcast globally — frontend filters by player name
          ioServer.emit('match:reminder', {
            ...notifPayload,
            players: [p1Name, p2Name],
            message: `🏸 "${matchName}" starts in ${label}! Get ready.`,
          });
        }

        // Email notifications
        const p1Email = emailByName[p1Name.toLowerCase()];
        const p2Email = emailByName[p2Name.toLowerCase()];

        // Only send email for 30min reminder, not 5min (too close)
        if (ms === REMIND_30_MS) {
          if (p1Email) await notifyPlayer(p1Email, p1Name, matchName, p2Name, scheduledAt, venue);
          if (p2Email) await notifyPlayer(p2Email, p2Name, matchName, p1Name, scheduledAt, venue);
        }

        console.log(`[Reminder] ${label} alert for: ${matchName}`);
      }
    }
  } catch (err: any) {
    console.error('[Reminder] Check failed:', err?.message);
  }
}

export function startMatchReminderJob(io?: Server) {
  if (io) ioServer = io;
  console.log('[Reminder] Match reminder job started (checks every 2 min)');
  checkAndNotify();
  setInterval(checkAndNotify, CHECK_INTERVAL);
}
