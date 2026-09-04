import mongoose from 'mongoose';

const watchlistSchema = new mongoose.Schema({
  profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
  contentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  contentType: { type: String, enum: ['movie', 'show'], required: true },
  addedAt: { type: Date, default: Date.now },
});

watchlistSchema.index({ profileId: 1, contentId: 1 }, { unique: true });

export const Watchlist = mongoose.model('Watchlist', watchlistSchema);
