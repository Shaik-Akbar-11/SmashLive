import mongoose, { Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  // Legacy profile data — kept for stats lookups, not used for auth
  mobile?: string;
  email?: string;
  emailVerified: boolean;
  gender?: string;
  state?: string;
  district?: string;
  role: 'admin' | 'referee' | 'player' | 'viewer';
  smashId?: string;
  onboardingComplete: boolean;
  rankingPoints: number;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  tournamentsPlayed: number;
  tournamentsWon: number;
  currentStreak: number;
  lastMatchAt?: Date;
  playingLevel?: string;
  preferredCategory?: string;
  age?: number;
  club?: string;
  university?: string;
}

const userSchema = new mongoose.Schema<IUser>({
  name:          { type: String, required: true },
  // mobile is legacy profile data — optional, non-unique, not used for auth
  mobile:        { type: String },
  // email is the auth identity for all new users
  email:         { type: String, lowercase: true, trim: true },
  emailVerified: { type: Boolean, default: false },
  gender:        { type: String },
  state:         { type: String },
  district:      { type: String },
  role: {
    type:    String,
    enum:    ['admin', 'referee', 'player', 'viewer'],
    default: 'player',
  },
  smashId:            { type: String, unique: true, sparse: true },
  onboardingComplete: { type: Boolean, default: false },
  playingLevel:       { type: String, enum: ['beginner', 'intermediate', 'advanced', 'professional'] },
  preferredCategory:  { type: String },
  age:                { type: Number },
  club:               { type: String },
  university:         { type: String },
  rankingPoints:      { type: Number, default: 0, index: true },
  matchesPlayed:      { type: Number, default: 0 },
  matchesWon:         { type: Number, default: 0 },
  matchesLost:        { type: Number, default: 0 },
  tournamentsPlayed:  { type: Number, default: 0 },
  tournamentsWon:     { type: Number, default: 0 },
  currentStreak:      { type: Number, default: 0 },
  lastMatchAt:        { type: Date },
}, { timestamps: true });

/**
 * Partial unique index on email — only enforces uniqueness when email is a
 * string. Legacy users without email neither collide nor break.
 */
userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: 'string' } },
    name: 'email_partial_unique',
  }
);

/** Plain (non-unique) index on mobile for legacy stats-lookup queries. */
userSchema.index({ mobile: 1 }, { name: 'mobile_1' });

export const User = mongoose.model<IUser>('User', userSchema);
