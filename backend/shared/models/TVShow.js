import mongoose from 'mongoose';

const tvShowSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    releaseYear: { type: Number },
    genreIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Genre', index: true }],
    cast: [{ type: String }],
    posterUrl: { type: String, default: '' },
    thumbnailUrl: { type: String, default: '' },
    maturityRating: { type: String, default: 'PG-13' },
    requiredPlan: { type: String, enum: ['free', 'basic', 'standard', 'premium'], default: 'free' },
    popularityScore: { type: Number, default: 0, index: true },
    avgRating: { type: Number, default: 0 },
  },
  { timestamps: true },
);

tvShowSchema.index({ title: 'text', cast: 'text' });

export const TVShow = mongoose.model('TVShow', tvShowSchema);
