import mongoose from 'mongoose';

const seasonSchema = new mongoose.Schema({
  showId: { type: mongoose.Schema.Types.ObjectId, ref: 'TVShow', required: true, index: true },
  seasonNumber: { type: Number, required: true },
  title: { type: String, default: '' },
});

seasonSchema.index({ showId: 1, seasonNumber: 1 }, { unique: true });

export const Season = mongoose.model('Season', seasonSchema);
