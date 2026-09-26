import { Match } from '../models/Match';

// ── Badminton scoring constants ──────────────────────────────────────────────
const GAME_POINTS     = 21; // normal winning score
const DEUCE_TRIGGER   = 20; // score at which deuce rules activate
const DEUCE_WIN_BY    = 2;  // must lead by 2 after deuce
const MAX_SCORE       = 30; // hard cap per game
const GAMES_TO_WIN    = 2;  // best of 3

/**
 * Returns true if the current score represents a completed game.
 */
function isGameOver(a: number, b: number): boolean {
  // Normal win
  if (a >= GAME_POINTS && a - b >= DEUCE_WIN_BY) return true;
  if (b >= GAME_POINTS && b - a >= DEUCE_WIN_BY) return true;
  // Cap win: 30-29
  if (a === MAX_SCORE || b === MAX_SCORE) return true;
  return false;
}

/**
 * Returns the winner side (1 or 2) of a finished game, or null.
 */
function gameWinner(a: number, b: number): 1 | 2 | null {
  if (!isGameOver(a, b)) return null;
  return a > b ? 1 : 2;
}

// ── Validation helpers ───────────────────────────────────────────────────────

function validatePlayers(matchType: string, players: any): string | null {
  if (!players || typeof players !== 'object') return 'Players are required';

  if (matchType === 'singles') {
    if (!players.p1 || !players.p2) return 'Singles requires p1 and p2';
    const ids = [players.p1?.id, players.p2?.id].filter(Boolean);
    if (new Set(ids).size !== ids.length) return 'Duplicate player detected';
    if (ids.length === 2 && ids[0] === ids[1]) return 'Same player cannot be on both sides';
  } else {
    const sideA: any[] = players.sideA || [];
    const sideB: any[] = players.sideB || [];
    if (sideA.length !== 2 || sideB.length !== 2) return 'Doubles requires exactly 2 players per side';
    const allIds = [...sideA, ...sideB].map((p: any) => p?.id).filter(Boolean);
    if (new Set(allIds).size !== allIds.length) return 'Duplicate player across sides';
    const sideAIds = new Set(sideA.map((p: any) => p?.id).filter(Boolean));
    for (const p of sideB) {
      if (p?.id && sideAIds.has(p.id)) return 'Same player cannot appear on both sides';
    }
  }
  return null;
}

// ── Public service ───────────────────────────────────────────────────────────

export const MatchService = {

  async createMatch(data: {
    name?: string;
    match_type?: string;
    category?: string;
    players: any;
    court?: string;
    tournamentId?: string;
    total_sets?: number;
    scheduledAt?: string | Date;
    toss?: any;
    status?: string;
  }) {
    const matchType = data.match_type || 'singles';
    const playerErr = validatePlayers(matchType, data.players);
    if (playerErr) throw new Error(playerErr);

    const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;

    // If scheduledAt is in the future, create as scheduled — not live
    const defaultStatus = scheduledAt && scheduledAt > new Date() ? 'scheduled' : 'live';

    const match = new Match({
      name:       data.name || 'Match',
      match_type: matchType,
      category:   data.category || 'friendly',
      players:    data.players,
      court:      data.court,
      tournamentId: data.tournamentId,
      total_sets: data.total_sets || 3,
      toss:       data.toss,
      status:     data.status || defaultStatus,
      scheduledAt,
      current_score: [0, 0],
      sets_won:   [0, 0],
      game_scores: [],
      current_game: 1,
      serving:    1,
    });

    return await match.save();
  },

  async getMatchById(id: string) {
    const match = await Match.findById(id).lean();
    if (!match) throw new Error('Match not found');
    return match;
  },

  async getMatches(status?: string) {
    const filter: any = {};
    if (status) filter.status = status;
    return await Match.find(filter).sort({ createdAt: -1 }).lean();
  },

  async startMatch(id: string) {
    const match = await Match.findById(id);
    if (!match) throw new Error('Match not found');
    if (match.status === 'completed') throw new Error('Match is already completed');
    if (match.status === 'live') throw new Error('Match is already live');

    // No time enforcement — creator starts it when ready
    match.status = 'live';
    match.last_update = new Date();
    return await match.save();
  },

  /**
   * Award a point to side (1 or 2) and apply full badminton scoring rules.
   * Returns { match, gameCompleted, matchCompleted }.
   */
  async scorePoint(id: string, side: 1 | 2, action: string = 'point') {
    if (side !== 1 && side !== 2) throw new Error('Invalid side — must be 1 or 2');

    const match = await Match.findById(id);
    if (!match) throw new Error('Match not found');
    if (match.status === 'completed') throw new Error('Cannot score a completed match');
    if (match.status === 'scheduled') throw new Error('Match has not started yet — call /start first');

    const score = [...(match.current_score as number[])] as [number, number];
    const setsWon = [...(match.sets_won as number[])] as [number, number];

    // Validate: score not already at or past max
    if (score[0] >= MAX_SCORE || score[1] >= MAX_SCORE) {
      throw new Error('Game is already at the score cap');
    }

    // Validate: game not already over
    if (isGameOver(score[0], score[1])) {
      throw new Error('This game is already completed — a new game should start');
    }

    // Award point
    score[side - 1]++;

    // Validate: would result in 30-30?
    if (score[0] === MAX_SCORE && score[1] === MAX_SCORE) {
      throw new Error('Score cannot reach 30-30 — invalid state');
    }

    // Serving switches on every rally won (standard badminton)
    match.serving = side;

    // Log event
    match.events.push({
      type: 'point',
      side,
      action,
      score: [...score],
      game: match.current_game,
      timestamp: new Date(),
    } as any);

    let gameCompleted = false;
    let matchCompleted = false;

    // Check if game is over
    const winner = gameWinner(score[0], score[1]);
    if (winner !== null) {
      gameCompleted = true;
      setsWon[winner - 1]++;

      // Record game result
      const gameScoreEntry = { scoreA: score[0], scoreB: score[1], winner };
      (match.game_scores as any[]).push(gameScoreEntry);

      // Check match winner
      if (setsWon[winner - 1] >= GAMES_TO_WIN) {
        matchCompleted = true;
        match.status = 'completed';
        match.winner = winner;
        match.sets_won = setsWon;
        match.current_score = [...score];
      } else {
        // Start next game
        match.current_game = (match.current_game || 1) + 1;
        match.sets_won = setsWon;
        match.current_score = [0, 0];
      }
    } else {
      match.current_score = score;
    }

    // Match is ongoing — no need to check for scheduled status here
    match.last_update = new Date();

    const saved = await match.save();
    return { match: saved, gameCompleted, matchCompleted };
  },

  /**
   * Undo the last scored point.
   * Restores score, serving, game, and sets_won from the event log.
   */
  async undoPoint(id: string) {
    const match = await Match.findById(id);
    if (!match) throw new Error('Match not found');
    if (match.status === 'completed') throw new Error('Cannot undo a completed match');

    const events = match.events as any[];
    const lastPoint = [...events].reverse().find(e => e.type === 'point');
    if (!lastPoint) throw new Error('No points to undo');

    // Remove that event
    const idx = events.map(e => e.timestamp?.toString()).lastIndexOf(lastPoint.timestamp?.toString());
    if (idx !== -1) events.splice(idx, 1);
    match.events = events as any;

    // Find the new last point to restore state from
    const prevPoint = [...events].reverse().find(e => e.type === 'point');

    if (!prevPoint) {
      // No events left — reset to start of match
      match.current_score = [0, 0];
      match.sets_won       = [0, 0];
      match.game_scores    = [] as any;
      match.current_game   = 1;
      match.serving        = 1;
    } else {
      // If the undone point was on a different game number, pop game_scores
      if (lastPoint.game > prevPoint.game) {
        const gameScores = match.game_scores as any[];
        gameScores.pop();
        match.game_scores = gameScores as any;
        match.sets_won = [
          gameScores.filter((g: any) => g.winner === 1).length,
          gameScores.filter((g: any) => g.winner === 2).length,
        ] as any;
        match.current_game = prevPoint.game;
      }
      // Restore score and serving from previous point's snapshot
      match.current_score = [...prevPoint.score] as any;
      match.serving       = prevPoint.side;
    }

    match.last_update = new Date();
    const saved = await match.save();
    return saved;
  },

  async endMatch(id: string) {
    const match = await Match.findById(id);
    if (!match) throw new Error('Match not found');
    if (match.status === 'completed') throw new Error('Match is already completed');

    const setsWon = match.sets_won as number[];
    if (setsWon[0] === 0 && setsWon[1] === 0) {
      throw new Error('Cannot end a match with no games won');
    }

    const winner = setsWon[0] > setsWon[1] ? 1 : setsWon[1] > setsWon[0] ? 2 : null;
    if (winner === null) throw new Error('Match is tied — cannot determine winner');

    match.status = 'completed';
    match.winner = winner as 1 | 2;
    match.last_update = new Date();
    return await match.save();
  },
};
