import mongoose from 'mongoose';

const episodeSchema = new mongoose.Schema(
  {
    seasonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Season', required: true, index: true },
    showId: { type: mongoose.Schema.Types.ObjectId, ref: 'TVShow', required: true, index: true },
    episodeNumber: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    durationSec: { type: Number, default: 0 },
    thumbnailUrl: { type: String, default: '' },
    videoUrl: { type: String, default: '' },
    // See Movie.videoQualities - same idea, only set for seed sources that
    // actually have multiple real resolution encodes.
    videoQualities: { type: mongoose.Schema.Types.Mixed, default: undefined },
    // Admin-pasted YouTube link/ID, an alternative to uploading a file -
    // same idea as Movie.trailerYoutubeKey but settable directly rather
    // than only auto-filled from TMDB (TMDB has no per-episode trailers).
    youtubeKey: { type: String, default: '' },
    subtitleUrl: { type: String, default: '' },
    subtitleLang: { type: String, default: 'English' },
    // See Movie.audioTracks - full alternate-language video files, swapped
    // in whole by the player. Base videoUrl is the "Original" track.
    audioTracks: {
      type: [{ lang: { type: String, required: true }, videoUrl: { type: String, required: true } }],
      default: [],
    },
    status: { type: String, enum: ['uploading', 'ready', 'failed'], default: 'ready' },
  },
  { timestamps: true },
);

episodeSchema.index({ seasonId: 1, episodeNumber: 1 }, { unique: true });

export const Episode = mongoose.model('Episode', episodeSchema);
