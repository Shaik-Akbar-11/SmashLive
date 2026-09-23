import mongoose from 'mongoose';

// Per-game score snapshot
const gameScoreSchema = new mongoose.Schema({
  scoreA: { type: Number, default: 0 },
  scoreB: { type: Number, default: 0 },
  winner: { type: Number, enum: [1, 2], default: null }, // 1=sideA, 2=sideB
}, { _id: false });

const matchSchema = new mongoose.Schema({
  matchId:    { type: String, index: false },  // no unique constraint - matchId is optional
  name:       { type: String },
  match_type: { type: String, enum: ['singles', 'doubles', 'mixed'], default: 'singles' },
  category:   { type: String, enum: ['friendly', 'competitive'], default: 'friendly' },

  // players: { p1, p2 } for singles | { sideA: [], sideB: [] } for doubles
  players: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Current game score (resets each game)
  current_score: { type: [Number], default: [0, 0] },

  // Games won by each side
  sets_won: { type: [Number], default: [0, 0] },

  // Total games to play (best of 3 standard)
  total_sets: { type: Number, default: 3 },

  // Game-by-game history
  game_scores: { type: [gameScoreSchema], default: [] },

  // Current game number (1-indexed)
  current_game: { type: Number, default: 1 },

  serving: { type: Number, enum: [1, 2], default: 1 },

  status: {
    type: String,
    enum: ['scheduled', 'live', 'completed'],
    default: 'scheduled',
    index: true,
  },

  winner: { type: Number, enum: [1, 2], default: null }, // 1=sideA, 2=sideB

  court:        { type: String },
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', index: true },

  // Event log
  events: [{
    type:      { type: String },
    side:      Number,
    action:    String,
    score:     [Number],
    game:      Number,
    timestamp: { type: Date, default: Date.now },
  }],

  last_update: { type: Date, default: Date.now },

  // Scheduled date/time (ISO string stored as Date)
  scheduledAt: { type: Date, default: null },

  // Toss
  toss: {
    winner:   { type: String },        // 'sideA' | 'sideB'
    result:   { type: String },        // 'heads' | 'tails'
    call:     { type: String },        // 'heads' | 'tails' (what sideA called)
    choice:   { type: String },        // 'serve' | 'receive' | 'side'
    official: { type: String },        // match official name
    venue:    { type: String },
    city:     { type: String },
    court_type: { type: String },
    date:     { type: String },
    time:     { type: String },
  },
}, { timestamps: true });

export const Match = mongoose.model('Match', matchSchema);
