/**
 * Registration deadline auto-close job.
 * Runs every 10 minutes. Finds tournaments where:
 *  - status is 'registration_open'
 *  - reg_deadline is set and is in the past
 * and closes them automatically.
 */

import { Tournament } from '../models/Tournament';

const CHECK_INTERVAL = 10 * 60 * 1000; // 10 minutes

async function closeExpiredRegistrations() {
  try {
    const today = new Date();
    // reg_deadline is stored as 'YYYY-MM-DD' string — treat end of that day as deadline
    const todayStr = today.toISOString().split('T')[0]; // e.g. "2026-09-26"

    const expired = await Tournament.find({
      status: 'registration_open',
      reg_deadline: { $lt: todayStr }, // deadline strictly before today
    }).lean();

    if (expired.length === 0) return;

    const ids = expired.map(t => t._id);
    await Tournament.updateMany(
      { _id: { $in: ids } },
      { $set: { status: 'registration_closed' } }
    );

    expired.forEach(t => {
      console.log(`[RegDeadline] Auto-closed registration for "${t.name}" (deadline: ${t.reg_deadline})`);
    });
  } catch (err: any) {
    console.error('[RegDeadline] Check failed:', err?.message);
  }
}

export function startRegistrationDeadlineJob() {
  console.log('[RegDeadline] Auto-close job started (checks every 10 min)');
  // Run immediately on startup to catch any missed deadlines
  closeExpiredRegistrations();
  setInterval(closeExpiredRegistrations, CHECK_INTERVAL);
}
