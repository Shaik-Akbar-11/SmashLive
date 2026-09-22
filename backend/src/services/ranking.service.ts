import { Match } from '../models/Match';
import { User } from '../models/User';

// Points awarded per match result
const POINTS = {
  win:  10,
  loss: 0,
};

/**
 * Extract player mobile/ids from a match's players field.
 * Returns { sideA: string[], sideB: string[] } of mobile numbers or IDs.
 */
function extractPlayers(match: any): { sideA: string[]; sideB: string[] } {
  const p = match.players || {};
  if (match.match_type === 'singles') {
    return {
      sideA: [p.p1?.mobile || p.p1?.id || p.p1?._id].filter(Boolean),
      sideB: [p.p2?.mobile || p.p2?.id || p.p2?._id].filter(Boolean),
    };
  }
  const sideA = (p.sideA || []).map((x: any) => x?.mobile || x?.id || x?._id).filter(Boolean);
  const sideB = (p.sideB || []).map((x: any) => x?.mobile || x?.id || x?._id).filter(Boolean);
  return { sideA, sideB };
}

/**
 * Called after a competitive match completes.
 * Updates rankingPoints, wins, losses, streak for involved players.
 */
export async function updateRankingsForMatch(matchId: string): Promise<void> {
  const match = await Match.findById(matchId).lean();
  if (!match || match.status !== 'completed' || !match.winner) return;
  if ((match as any).category !== 'competitive') return; // only competitive matches affect rankings

  const { sideA, sideB } = extractPlayers(match);
  const winnerSide = match.winner === 1 ? sideA : sideB;
  const loserSide  = match.winner === 1 ? sideB : sideA;

  const updateSide = async (ids: string[], won: boolean) => {
    for (const identifier of ids) {
      const user = await User.findOne({
        $or: [{ mobile: identifier }, { _id: identifier }],
      });
      if (!user) continue;

      user.matchesPlayed += 1;
      user.lastMatchAt    = new Date();

      if (won) {
        user.matchesWon      += 1;
        user.rankingPoints   += POINTS.win;
        user.currentStreak    = user.currentStreak >= 0 ? user.currentStreak + 1 : 1;
      } else {
        user.matchesLost     += 1;
        user.currentStreak    = user.currentStreak <= 0 ? user.currentStreak - 1 : -1;
      }

      await user.save();
    }
  };

  await Promise.all([
    updateSide(winnerSide, true),
    updateSide(loserSide, false),
  ]);
}

/**
 * Recompute all rankings from scratch (full recalculation from match history).
 * Useful for admin reset or data correction.
 */
export async function recalculateAllRankings(): Promise<void> {
  // Reset all users
  await User.updateMany({}, {
    rankingPoints: 0, matchesPlayed: 0, matchesWon: 0,
    matchesLost: 0, currentStreak: 0, lastMatchAt: undefined,
  });

  // Process all completed competitive matches oldest-first
  const matches = await Match.find({
    status: 'completed',
    category: 'competitive',
    winner: { $exists: true, $ne: null },
  }).sort({ updatedAt: 1 }).lean();

  for (const match of matches) {
    await updateRankingsForMatch(String(match._id));
  }
}

/**
 * Get ranked list of players.
 * Optional filter by state for state-level rankings.
 */
export async function getRankings(scope: 'world' | 'state', state?: string, district?: string) {
  const filter: any = {};  // Show ALL players, not just those with matches
  if (scope === 'state' && state) filter.state = state;
  if (district) filter.district = district;

  const users = await User.find(filter)
    .select('name smashId state district gender rankingPoints matchesPlayed matchesWon matchesLost currentStreak lastMatchAt')
    .sort({ rankingPoints: -1, matchesWon: -1 })
    .lean();

  return users.map((u, i) => ({
    ...u,
    rank:    i + 1,
    winRate: u.matchesPlayed > 0
      ? Math.round((u.matchesWon / u.matchesPlayed) * 100)
      : 0,
  }));
}
