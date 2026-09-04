import mongoose from 'mongoose';

const ratingSchema = new mongoose.Schema(
  {
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
    contentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    contentType: { type: String, enum: ['movie', 'show'], required: true },
    value: { type: Number, min: 1, max: 5, required: true },
  },
  { timestamps: true },
);

ratingSchema.index({ profileId: 1, contentId: 1 }, { unique: true });

export const Rating = mongoose.model('Rating', ratingSchema);
