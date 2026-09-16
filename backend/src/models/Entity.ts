import mongoose from 'mongoose';

/**
 * Reusable named entity for autocomplete.
 * Covers: city, venue, club, university
 */
const entitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['city', 'venue', 'club', 'university'],
    required: true,
    index: true,
  },
  name:      { type: String, required: true, trim: true },
  // normalised lowercase for duplicate/search
  nameLower: { type: String, required: true, index: true },
  // optional context fields
  state:     { type: String },
  city:      { type: String },   // for venues — which city they're in
}, { timestamps: true });

// Prevent exact duplicates (same type + normalised name)
entitySchema.index({ type: 1, nameLower: 1 }, { unique: true });

export const Entity = mongoose.model('Entity', entitySchema);
