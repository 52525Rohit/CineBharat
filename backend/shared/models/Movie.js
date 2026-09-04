import mongoose from 'mongoose';

const movieSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    releaseYear: { type: Number },
    genreIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Genre', index: true }],
    cast: [{ type: String }],
    director: { type: String, default: '' },
    durationSec: { type: Number, default: 0 },
    maturityRating: { type: String, default: 'PG-13' },
    posterUrl: { type: String, default: '' },
    thumbnailUrl: { type: String, default: '' },
    // Real official trailer from TMDB (YouTube video ID). This is the only
    // genuinely real video content available - TMDB has no full-film
    // streams, only metadata/artwork/trailers. "Play" uses this when set.
    trailerYoutubeKey: { type: String, default: '' },
    trailerUrl: { type: String, default: '' },
    // Fallback only for titles with no TMDB trailer: a placeholder sample
    // clip, unrelated to the movie. Local dev stand-in either way for what
    // production would resolve to a signed CloudFront HLS manifest — §05.
    videoUrl: { type: String, default: '' },
    // Real per-resolution files for the same clip, keyed by '360p'/'720p'/
    // '1080p' - only populated for the handful of seed sources that
    // actually have multi-resolution encodes (see backend/scripts/seed.js).
    // Absent/undefined means there's only ever the one videoUrl above, and
    // the player's quality picker degrades to a plan-gated label only.
    videoQualities: { type: mongoose.Schema.Types.Mixed, default: undefined },
    // One subtitle track (WebVTT) per movie for now - .srt uploads get
    // auto-converted, see shared/utils/videoRemux.js. A real multi-language
    // array is the natural next step once there's content to put in it.
    subtitleUrl: { type: String, default: '' },
    subtitleLang: { type: String, default: 'English' },
    // Alternate-language dubs: each is a full replacement video file (no
    // multi-audio-track support on the web without HLS), swapped in whole
    // by the player. The base videoUrl above is the "Original" track.
    audioTracks: {
      type: [{ lang: { type: String, required: true }, videoUrl: { type: String, required: true } }],
      default: [],
    },
    requiredPlan: { type: String, enum: ['free', 'basic', 'standard', 'premium'], default: 'free' },
    status: { type: String, enum: ['uploading', 'ready', 'failed'], default: 'ready' },
    popularityScore: { type: Number, default: 0, index: true },
    avgRating: { type: Number, default: 0 },
  },
  { timestamps: true },
);

movieSchema.index({ title: 'text', cast: 'text', director: 'text' }, { weights: { title: 10, cast: 5, director: 5 } });

export const Movie = mongoose.model('Movie', movieSchema);
