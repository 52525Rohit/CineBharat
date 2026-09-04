import mongoose from 'mongoose';

const watchHistorySchema = new mongoose.Schema({
  profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
  contentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  contentType: { type: String, enum: ['movie', 'episode'], required: true },
  watchedAt: { type: Date, default: Date.now },
  completed: { type: Boolean, default: false },
});

watchHistorySchema.index({ profileId: 1, watchedAt: -1 });

export const WatchHistory = mongoose.model('WatchHistory', watchHistorySchema);
