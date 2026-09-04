import mongoose from 'mongoose';

const watchProgressSchema = new mongoose.Schema(
  {
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
    contentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    contentType: { type: String, enum: ['movie', 'episode'], required: true },
    positionSec: { type: Number, default: 0 },
    durationSec: { type: Number, default: 0 },
  },
  { timestamps: true },
);

watchProgressSchema.index({ profileId: 1, contentId: 1 }, { unique: true });

export const WatchProgress = mongoose.model('WatchProgress', watchProgressSchema);
