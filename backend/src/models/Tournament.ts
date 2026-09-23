import mongoose from 'mongoose';

// A single match slot within the tournament bracket
const tournamentMatchSchema = new mongoose.Schema({
  round:        { type: Number, required: true },       // 1 = QF, 2 = SF, 3 = F (knockout) | round number (RR)
  matchIndex:   { type: Number, required: true },       // position within the round
  participantA: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant', default: null },
  participantB: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant', default: null },
  matchId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null },
  winner:       { type: mongoose.Schema.Types.ObjectId, ref: 'Participant', default: null },
  status:       { type: String, enum: ['scheduled', 'live', 'completed', 'bye'], default: 'scheduled' },
  scoreA:       { type: [Number], default: [] },  // games won by A
  scoreB:       { type: [Number], default: [] },  // games won by B
}, { _id: true });

const tournamentSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  slug:          { type: String, unique: true, sparse: true, index: true },
  description:   { type: String },
  city:          { type: String },
  venue:         { type: String },
  start_date:    { type: String },
  end_date:      { type: String },
  reg_deadline:  { type: String },
  max_participants: { type: Number, default: 64 },
  organizer:     { type: String },
  creatorId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

  // Singles or Doubles
  category:      { type: String, enum: ['singles', 'doubles'], default: 'singles' },

  // Tournament format
  format:        { type: String, enum: ['knockout', 'round_robin'], default: 'knockout' },

  // Lifecycle status
  status: {
    type: String,
    enum: ['draft', 'registration_open', 'registration_closed', 'draw_generated', 'in_progress', 'completed'],
    default: 'registration_open',
    index: true,
  },

  // Generated bracket/schedule
  bracket: { type: [tournamentMatchSchema], default: [] },

  // Tournament winner (participant _id)
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant', default: null },

  // Legacy compat
  winnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
}, { timestamps: true });

export const Tournament = mongoose.model('Tournament', tournamentSchema);
