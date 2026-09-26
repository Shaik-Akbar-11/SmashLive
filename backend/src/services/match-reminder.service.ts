/**
 * Match reminder service.
 * Runs every 2 minutes and sends in-app notifications to players
 * whose matches are starting within 30 minutes or 5 minutes.
 * Uses DB flags on the match to survive server restarts.
 */

import { Match } from '../models/Match';
import type { EmailProvider } from './email.provider';
import type { Server } from 'socket.io';

const REMIND_30_MS   = 30 * 60 * 1000;
const REMIND_5_MS    = 5  * 60 * 1000;
const CHECK_INTERVAL = 2  * 60 * 1000; // check every 2 min

let emailProvider: EmailProvider | null = null;
let ioServer: Server | null = null;

export function setReminderEmailProvider(p: EmailProvider) { emailProvider = p; }
export function setReminderIo(io: Server) { ioServer = io; }

async function checkAndNotify() {
  if (!ioServer) return;
  try {
    const now = new Date();

    const windows = [
      { ms: REMIND_30_MS, flag: 'reminded30', label: '30 minutes' },
      { ms: REMIND_5_MS,  flag: 'reminded5',  label: '5 minutes'  },
    ];

    for (const { ms, flag, label } of windows) {
      // Find scheduled matches whose scheduledAt falls within the next `ms` ms
      // and haven't been reminded yet for this window
      const cutoff = new Date(now.getTime() + ms);

      const upcoming = await (Match as any).find({
        status:      'scheduled',
        scheduledAt: { $gte: now, $lte: cutoff },
        [flag]:      { $ne: true },
      }).lean();

      for (const match of upcoming) {
        // Mark as reminded in DB so restarts don't re-send
        await (Match as any).findByIdAndUpdate(match._id, { $set: { [flag]: true } });

        const p       = (match as any).players || {};
        const venue   = (match as any).toss?.venue || (match as any).toss?.city || '';
        const matchName = (match as any).name || 'Match';
        const matchId   = String(match._id);

        const p1Name = p.p1?.name || p.sideA?.[0]?.name || 'Athlete A';
        const p2Name = p.p2?.name || p.sideB?.[0]?.name || 'Athlete B';

        ioServer.emit('match:reminder', {
          type: 'match_reminder',
          matchId,
          matchName,
          venue,
          scheduledAt: (match as any).scheduledAt,
          minutesBefore: ms / 60000,
          players: [p1Name, p2Name],
          message: `🏸 "${matchName}" starts in ${label}! Get ready.`,
        });

        console.log(`[Reminder] ${label} alert sent for: ${matchName} (${p1Name} vs ${p2Name})`);
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
