import mongoose from 'mongoose';
import { Tournament } from '../models/Tournament';
import { Participant } from '../models/Participant';
import { Match } from '../models/Match';
import { User } from '../models/User';

// Ranking points for tournament results
const TOURNAMENT_POINTS = { winner: 50, runnerUp: 25, semiFinal: 10, quarterFinal: 5 };

// Socket.IO instance injected from server.ts
let _io: any = null;
export function setTournamentIo(io: any) { _io = io; }

function getRoundLabel(round: number, maxRound: number): string {
  const diff = maxRound - round;
  if (diff === 0) return 'Final';
  if (diff === 1) return 'Semi Final';
  if (diff === 2) return 'Quarter Final';
  return `Round ${round}`;
}

async function notifyNextRoundPlayers(
  tournament: any,
  nextSlot: any,
  allParticipants: any[],
) {
  if (!nextSlot || !nextSlot.participantA || !nextSlot.participantB) return;
  const bracket = tournament.bracket as any[];
  const maxRound = Math.max(...bracket.map((m: any) => m.round));
  const label = getRoundLabel(nextSlot.round, maxRound);

  const pA = allParticipants.find(p => String(p._id) === String(nextSlot.participantA));
  const pB = allParticipants.find(p => String(p._id) === String(nextSlot.participantB));
  if (!pA || !pB) return;

  const venue = tournament.venue;
  const city  = tournament.city;
  const date  = tournament.start_date;

  // In-app bell notification via Socket.IO only
  if (_io) {
    _io.emit('tournament:next_match', {
      tournamentId: String(tournament._id),
      tournamentName: tournament.name,
      round: label,
      players: [pA.name, pB.name],
      venue,
      city,
      date,
      message: `🏸 Next match ready: ${label} — ${tournament.name}`,
    });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function resolveQuery(id: string) {
  return mongoose.isValidObjectId(id) ? { _id: id } : { slug: id };
}

// ── Bracket generators ────────────────────────────────────────────────────────

function buildKnockout(participants: any[]): any[] {
  const slots  = nextPow2(participants.length);
  const rounds = Math.log2(slots);
  const bracket: any[] = [];

  // Round 1
  for (let i = 0; i < slots / 2; i++) {
    const pA   = participants[i * 2]     || null;
    const pB   = participants[i * 2 + 1] || null;
    const isBye = !pA || !pB;
    bracket.push({
      round: 1, matchIndex: i,
      participantA: pA?._id || null,
      participantB: pB?._id || null,
      winner:  isBye ? (pA?._id || pB?._id || null) : null,
      status:  isBye ? 'bye' : 'scheduled',
      scoreA: [], scoreB: [],
    });
  }

  // Later rounds — empty
  for (let r = 2; r <= rounds; r++) {
    const count = slots / Math.pow(2, r);
    for (let i = 0; i < count; i++) {
      bracket.push({
        round: r, matchIndex: i,
        participantA: null, participantB: null,
        winner: null, status: 'scheduled',
        scoreA: [], scoreB: [],
      });
    }
  }

  // Auto-advance byes into round 2
  bracket.filter(m => m.round === 1 && m.status === 'bye').forEach(m => {
    const next = bracket.find(x => x.round === 2 && x.matchIndex === Math.floor(m.matchIndex / 2));
    if (next && m.winner) {
      if (m.matchIndex % 2 === 0) next.participantA = m.winner;
      else                         next.participantB = m.winner;
    }
  });

  return bracket;
}

function buildRoundRobin(participants: any[]): any[] {
  const bracket: any[] = [];
  let idx = 0;
  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      bracket.push({
        round: 1, matchIndex: idx++,
        participantA: participants[i]._id,
        participantB: participants[j]._id,
        winner: null, status: 'scheduled',
        scoreA: [], scoreB: [],
      });
    }
  }
  return bracket;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const TournamentService = {

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async createTournament(data: any) {
    if (!data.name) throw new Error('Tournament name is required');
    const t = new Tournament({ ...data, status: 'registration_open', bracket: [] });
    return await t.save();
  },

  async getTournaments(status?: string) {
    const filter: any = {};
    if (status) filter.status = status;
    const list = await Tournament.find(filter).sort({ createdAt: -1 }).lean();

    const ids = list.map(t => t._id);

    const pCounts = await Participant.aggregate([
      { $match: { tournament_id: { $in: ids } } },
      { $group: { _id: '$tournament_id', count: { $sum: 1 } } },
    ]);
    const pMap: Record<string, number> = {};
    pCounts.forEach(c => { pMap[String(c._id)] = c.count; });

    const mCounts = await Match.aggregate([
      { $match: { tournamentId: { $in: ids } } },
      { $group: { _id: '$tournamentId', count: { $sum: 1 } } },
    ]);
    const mMap: Record<string, number> = {};
    mCounts.forEach(c => { mMap[String(c._id)] = c.count; });

    return list.map(t => ({
      ...t,
      participantCount: pMap[String(t._id)] || 0,
      matchCount:       mMap[String(t._id)] || 0,
    }));
  },

  async getTournamentById(id: string) {
    const t = await Tournament.findOne(resolveQuery(id)).lean();
    if (!t) throw new Error('Tournament not found');
    return t;
  },

  async updateTournament(id: string, data: any) {
    // Protect lifecycle fields from direct edit
    const safe = { ...data };
    ['status', 'winner', 'bracket'].forEach(k => delete safe[k]);
    const t = await Tournament.findByIdAndUpdate(id, safe, { new: true, runValidators: true }).lean();
    if (!t) throw new Error('Tournament not found');
    return t;
  },

  async deleteTournament(id: string) {
    const q = resolveQuery(id);
    const t = mongoose.isValidObjectId(id)
      ? await Tournament.findByIdAndDelete(id)
      : await Tournament.findOneAndDelete(q);
    if (!t) throw new Error('Tournament not found');
    return { message: 'Deleted' };
  },

  // ── Registration ───────────────────────────────────────────────────────────

  async registerParticipant(tournamentId: string, data: any) {
    const tournament = await Tournament.findOne(resolveQuery(tournamentId));
    if (!tournament) throw new Error('Tournament not found');

    if (!['registration_open', 'draft'].includes(tournament.status)) {
      throw new Error('Registration is closed for this tournament');
    }
    if (tournament.reg_deadline && new Date() > new Date(tournament.reg_deadline + 'T23:59:59')) {
      throw new Error('Registration deadline has passed');
    }

    if (tournament.category === 'doubles' && !data.partner_name) {
      throw new Error('Doubles registration requires partner name');
    }

    // Duplicate check — phone, smash_id, or user_id
    const orClause: any[] = [];
    if (data.phone)    orClause.push({ phone: data.phone });
    if (data.smash_id) orClause.push({ smash_id: data.smash_id });
    if (data.user_id)  orClause.push({ user_id: data.user_id });
    if (orClause.length) {
      const dup = await Participant.findOne({ tournament_id: tournament._id, $or: orClause });
      if (dup) throw new Error('You are already registered in this tournament');
    }

    // Count only pending/accepted toward the cap (not rejected)
    const count = await Participant.countDocuments({
      tournament_id: tournament._id,
      status: { $in: ['pending', 'registered', 'accepted', 'confirmed'] },
    });
    if (tournament.max_participants && count >= tournament.max_participants) {
      throw new Error('Tournament is full — maximum participants reached');
    }

    const p = new Participant({ ...data, tournament_id: tournament._id, status: 'pending' });
    return await p.save();
  },

  async approveParticipant(tournamentId: string, participantId: string) {
    const t = await Tournament.findById(tournamentId);
    if (!t) throw new Error('Tournament not found');
    const p = await Participant.findOne({ _id: participantId, tournament_id: t._id });
    if (!p) throw new Error('Participant not found');
    p.status = 'accepted';
    return await p.save();
  },

  async rejectParticipant(tournamentId: string, participantId: string) {
    const t = await Tournament.findById(tournamentId);
    if (!t) throw new Error('Tournament not found');
    const p = await Participant.findOne({ _id: participantId, tournament_id: t._id });
    if (!p) throw new Error('Participant not found');
    p.status = 'rejected';
    return await p.save();
  },

  async getParticipants(tournamentId: string) {
    const t = await Tournament.findOne(resolveQuery(tournamentId)).lean();
    if (!t) throw new Error('Tournament not found');
    return await Participant.find({ tournament_id: t._id }).sort({ status: 1, createdAt: 1 }).lean();
  },

  // ── Draw ───────────────────────────────────────────────────────────────────

  async generateDraw(tournamentId: string) {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) throw new Error('Tournament not found');
    if (['draw_generated', 'in_progress', 'completed'].includes(tournament.status)) {
      throw new Error('Draw has already been generated for this tournament');
    }

    const participants = await Participant.find({
      tournament_id: tournament._id,
      status: { $in: ['accepted', 'registered', 'confirmed'] }, // accepted = approved, registered = legacy
    }).lean();
    if (participants.length < 2) throw new Error('Need at least 2 accepted participants to generate a draw');

    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const bracket  = tournament.format === 'round_robin'
      ? buildRoundRobin(shuffled)
      : buildKnockout(shuffled);

    tournament.bracket = bracket as any;
    tournament.status  = 'draw_generated';
    return await tournament.save();
  },

  async getBracket(tournamentId: string) {
    const t = await Tournament.findById(tournamentId)
      .populate('bracket.participantA bracket.participantB bracket.winner')
      .lean();
    if (!t) throw new Error('Tournament not found');
    return t.bracket || [];
  },

  // ── Record result & advance bracket ───────────────────────────────────────

  async recordResult(tournamentId: string, bracketMatchId: string, winnerParticipantId: string) {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    const bracket = tournament.bracket as any[];
    const slot    = bracket.find(m => String(m._id) === bracketMatchId);
    if (!slot)                      throw new Error('Bracket match not found');
    if (slot.status === 'completed') throw new Error('This match is already completed');

    const wId = String(winnerParticipantId);
    if (String(slot.participantA) !== wId && String(slot.participantB) !== wId) {
      throw new Error('Winner must be one of the two participants in this match');
    }

    slot.winner = new mongoose.Types.ObjectId(winnerParticipantId);
    slot.status = 'completed';

    if (tournament.format === 'knockout') {
      const nextRound = slot.round + 1;
      const nextIdx   = Math.floor(slot.matchIndex / 2);
      const isSlotA   = slot.matchIndex % 2 === 0;
      const nextSlot  = bracket.find(m => m.round === nextRound && m.matchIndex === nextIdx);

      if (nextSlot) {
        if (isSlotA) nextSlot.participantA = slot.winner;
        else         nextSlot.participantB = slot.winner;

        // Notify both players in next slot if it's now fully populated
        const allParticipants = await Participant.find({ tournament_id: tournament._id }).lean();
        tournament.markModified('bracket');
        const saved = await tournament.save();
        // Re-read to get populated next slot
        const freshNextSlot = (saved.bracket as any[]).find(
          (m: any) => m.round === nextRound && m.matchIndex === nextIdx
        );
        setImmediate(() => notifyNextRoundPlayers(saved, freshNextSlot, allParticipants));
        return saved;
      } else {
        // Final completed — award ranking points
        tournament.status = 'completed';
        (tournament as any).winner = slot.winner;
        await Participant.findByIdAndUpdate(winnerParticipantId, { status: 'winner' });

        // Award points to winner
        const winnerP = await Participant.findById(winnerParticipantId).lean();
        if (winnerP?.phone) {
          await User.findOneAndUpdate(
            { mobile: winnerP.phone },
            { $inc: { rankingPoints: TOURNAMENT_POINTS.winner, tournamentsWon: 1 } }
          );
        }

        // Award runner-up points
        const loserPId = String(slot.participantA) === winnerParticipantId ? slot.participantB : slot.participantA;
        const loserP   = loserPId ? await Participant.findById(loserPId).lean() : null;
        if (loserP?.phone) {
          await User.findOneAndUpdate(
            { mobile: loserP.phone },
            { $inc: { rankingPoints: TOURNAMENT_POINTS.runnerUp } }
          );
        }

        // Increment tournamentsPlayed for all participants
        const allParticipants = await Participant.find({ tournament_id: tournament._id }).lean();
        const phones = allParticipants.map(p => p.phone).filter(Boolean);
        if (phones.length) {
          await User.updateMany({ mobile: { $in: phones } }, { $inc: { tournamentsPlayed: 1 } });
        }
      }

      const loserId = String(slot.participantA) === wId ? slot.participantB : slot.participantA;
      if (loserId) await Participant.findByIdAndUpdate(loserId, { status: 'eliminated' });
    }

    if (tournament.status === 'draw_generated') tournament.status = 'in_progress';

    tournament.markModified('bracket');
    return await tournament.save();
  },

  // ── Tournament matches ─────────────────────────────────────────────────────

  async getTournamentMatches(tournamentId: string) {
    return await Match.find({ tournamentId }).sort({ createdAt: -1 }).lean();
  },

  // ── Standings (Round Robin) ────────────────────────────────────────────────

  async getStandings(tournamentId: string) {
    const tournament = await Tournament.findById(tournamentId).lean();
    if (!tournament) throw new Error('Tournament not found');
    if (tournament.format !== 'round_robin') {
      throw new Error('Standings are only available for round robin tournaments');
    }

    const bracket      = (tournament.bracket || []) as any[];
    const participants = await Participant.find({ tournament_id: tournament._id }).lean();

    const table: Record<string, any> = {};
    participants.forEach(p => {
      table[String(p._id)] = { participant: p, played: 0, wins: 0, losses: 0, points: 0 };
    });

    bracket.filter(m => m.status === 'completed').forEach(m => {
      const a = String(m.participantA);
      const b = String(m.participantB);
      const w = String(m.winner);
      if (table[a]) { table[a].played++; if (w === a) { table[a].wins++; table[a].points += 2; } else table[a].losses++; }
      if (table[b]) { table[b].played++; if (w === b) { table[b].wins++; table[b].points += 2; } else table[b].losses++; }
    });

    return Object.values(table).sort((a: any, b: any) => b.points - a.points || b.wins - a.wins);
  },

  // ── Close registration ─────────────────────────────────────────────────────

  async closeRegistration(id: string) {
    const t = await Tournament.findById(id);
    if (!t) throw new Error('Tournament not found');
    if (t.status !== 'registration_open') throw new Error('Tournament is not open for registration');
    t.status = 'registration_closed';
    return await t.save();
  },

  // ── Bye — participant forfeits, opponent auto-advances ─────────────────────

  async byeMatch(tournamentId: string, bracketMatchId: string, requestingUserId: string) {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    const bracket = tournament.bracket as any[];
    const slot    = bracket.find(m => String(m._id) === bracketMatchId);
    if (!slot)                       throw new Error('Bracket match not found');
    if (slot.status === 'completed' || slot.status === 'bye') {
      throw new Error('This match is already resolved');
    }
    if (!slot.participantA || !slot.participantB) {
      throw new Error('Match is not yet ready — waiting for opponents');
    }

    // Determine which participant belongs to the requesting user
    const [pA, pB] = await Promise.all([
      Participant.findById(slot.participantA).lean(),
      Participant.findById(slot.participantB).lean(),
    ]);

    let forfeitParticipantId: string;
    let winnerParticipantId: string;

    const matchesUser = (p: any) =>
      (p?.user_id && String(p.user_id) === requestingUserId);

    if (matchesUser(pA)) {
      forfeitParticipantId = String(slot.participantA);
      winnerParticipantId  = String(slot.participantB);
    } else if (matchesUser(pB)) {
      forfeitParticipantId = String(slot.participantB);
      winnerParticipantId  = String(slot.participantA);
    } else {
      throw new Error('You are not a participant in this match');
    }

    // Mark slot as bye with the opponent as winner
    slot.winner = new mongoose.Types.ObjectId(winnerParticipantId);
    slot.status = 'bye';

    // Advance winner to next round + notify
    if (tournament.format === 'knockout') {
      const nextRound = slot.round + 1;
      const nextIdx   = Math.floor(slot.matchIndex / 2);
      const isSlotA   = slot.matchIndex % 2 === 0;
      const nextSlot  = bracket.find(m => m.round === nextRound && m.matchIndex === nextIdx);
      if (nextSlot) {
        if (isSlotA) nextSlot.participantA = slot.winner;
        else         nextSlot.participantB = slot.winner;
      }
    }

    await Participant.findByIdAndUpdate(forfeitParticipantId, { status: 'eliminated' });

    if (tournament.status === 'draw_generated') tournament.status = 'in_progress';
    tournament.markModified('bracket');
    const saved = await tournament.save();

    // Notify winner that they advance (opponent forfeited)
    if (tournament.format === 'knockout') {
      const nextRound = slot.round + 1;
      const nextIdx   = Math.floor(slot.matchIndex / 2);
      const freshNextSlot = (saved.bracket as any[]).find(
        (m: any) => m.round === nextRound && m.matchIndex === nextIdx
      );
      const allParticipants = await Participant.find({ tournament_id: tournament._id }).lean();

      // Immediate bell notification to winner
      const winnerP = allParticipants.find(p => String(p._id) === winnerParticipantId);
      if (winnerP && _io) {
        const bracket2 = saved.bracket as any[];
        const maxRound = Math.max(...bracket2.map((m: any) => m.round));
        _io.emit('tournament:next_match', {
          tournamentId: String(saved._id),
          tournamentName: (saved as any).name,
          round: getRoundLabel(slot.round, maxRound),
          players: [winnerP.name],
          venue: (saved as any).venue,
          city:  (saved as any).city,
          date:  (saved as any).start_date,
          message: `✅ Opponent forfeited — you advance in ${(saved as any).name}!`,
          forfeit: true,
        });
      }

      // If next slot is now fully populated, notify both players
      if (freshNextSlot) {
        setImmediate(() => notifyNextRoundPlayers(saved, freshNextSlot, allParticipants));
      }
    }

    return saved;
