import mongoose, { Document } from 'mongoose';

export interface IParticipant extends Document {
  tournament_id: mongoose.Types.ObjectId;
  name: string;
  phone?: string;
  gender?: string;
  category?: string;
  state?: string;
  district?: string;
  smash_id?: string;
  // Doubles partner
  partner_name?: string;
  partner_phone?: string;
  partner_smash_id?: string;
  // Tournament state
  seed?: number;
  status: 'pending' | 'registered' | 'accepted' | 'rejected' | 'confirmed' | 'eliminated' | 'winner';
  user_id?: mongoose.Types.ObjectId;
}

const participantSchema = new mongoose.Schema<IParticipant>({
  tournament_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
  name:          { type: String, required: true },
  phone:         { type: String },
  gender:        { type: String },
  category:      { type: String },
  state:         { type: String },
  district:      { type: String },
  smash_id:      { type: String },
  // Doubles
  partner_name:       { type: String },
  partner_phone:      { type: String },
  partner_smash_id:   { type: String },
  // Tournament state
  seed:   { type: Number },
  status: { type: String, enum: ['pending', 'registered', 'accepted', 'rejected', 'confirmed', 'eliminated', 'winner'], default: 'pending' },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export const Participant = mongoose.model<IParticipant>('Participant', participantSchema);
