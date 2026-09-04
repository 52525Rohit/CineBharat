import { Router } from 'express';
import { Movie } from 'shared/models/Movie.js';
import { WatchProgress } from 'shared/models/WatchProgress.js';
import { User } from 'shared/models/User.js';
import { Profile } from 'shared/models/Profile.js';
import { requireAuth } from 'shared/middleware/auth.js';
import { PLAN_RANK } from 'shared/utils/plans.js';

export const moviesRouter = Router();

moviesRouter.get('/trending', async (req, res, next) => {
  try {
    res.json(await Movie.find({ status: 'ready' }).sort({ popularityScore: -1 }).limit(20));
  } catch (err) {
    next(err);
  }
});

moviesRouter.get('/popular', async (req, res, next) => {
  try {
    res.json(await Movie.find({ status: 'ready' }).sort({ avgRating: -1 }).limit(20));
  } catch (err) {
    next(err);
  }
});

moviesRouter.get('/', async (req, res, next) => {
  try {
    const { genre, year, page = 1, limit = 24 } = req.query;
    const filter = { status: 'ready' };
    if (genre) filter.genreIds = genre;
    if (year) filter.releaseYear = Number(year);

    const movies = await Movie.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
    res.json(movies);
  } catch (err) {
    next(err);
  }
});

moviesRouter.get('/:id', async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id).populate('genreIds');
    if (!movie) return res.status(404).json({ error: 'not_found' });
    res.json(movie);
  } catch (err) {
    next(err);
  }
});

// Playback authorization: confirm entitlement, then hand back a URL.
// Production signs a short-lived CloudFront URL instead - see docs §05.
moviesRouter.get('/:id/playback', requireAuth, async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie || movie.status !== 'ready') return res.status(404).json({ error: 'not_found' });

    const user = await User.findById(req.user.id);
    if (PLAN_RANK[user.plan] < PLAN_RANK[movie.requiredPlan]) {
      return res.status(403).json({ error: 'upgrade_required', requiredPlan: movie.requiredPlan });
    }

    const profileId = req.query.profileId;
    let resumePositionSec = 0;
    if (profileId) {
      const profile = await Profile.findOne({ _id: profileId, userId: req.user.id });
      if (profile) {
        const progress = await WatchProgress.findOne({ profileId, contentId: movie._id });
        resumePositionSec = progress?.positionSec ?? 0;
      }
    }

    // An admin-uploaded file (via /admin/upload) always wins - it's always
    // served from our own /uploads/ path, which is exactly what makes it
    // distinguishable from the seed script's external placeholder clips
    // (test-videos.co.uk etc.) without needing a separate schema field.
    // Only fall back to the TMDB trailer - the only other genuinely real
    // video content available - when there's no real upload; and only
    // fall back further to a placeholder clip when there's neither.
    // Progress/resume only applies to a real playable file, not the
    // YouTube path - an embed can't be introspected for position without
    // the YouTube IFrame API, which isn't wired up here.
    const hasRealUpload = movie.videoUrl?.startsWith('/uploads/');
    const hasDubs = (movie.audioTracks?.length ?? 0) > 0;

    // Dubs need the real <video> element (a YouTube iframe can't swap
    // audio), so a title with alternate-language files skips the trailer.
    if (!hasRealUpload && !hasDubs && movie.trailerYoutubeKey) {
      return res.json({
        type: 'youtube',
        youtubeKey: movie.trailerYoutubeKey,
        title: movie.title,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });
    }

    res.json({
      type: 'sample',
      title: movie.title,
      videoUrl: movie.videoUrl,
      // A real upload replaces the whole source - the seed's multi-res
      // videoQualities map (test-videos.co.uk clips) must not shadow it,
      // or the player picks a stale quality URL over the uploaded file.
      videoQualities: hasRealUpload ? null : movie.videoQualities || null,
      audioTracks: movie.audioTracks || [],
      manifestUrl: movie.videoUrl,
      subtitleUrl: movie.subtitleUrl || null,
      subtitleLang: movie.subtitleLang,
      resumePositionSec,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
  } catch (err) {
    next(err);
  }
});
