import { Router } from 'express';
import { WatchHistory } from 'shared/models/WatchHistory.js';
import { Movie } from 'shared/models/Movie.js';
import { requireAuth } from 'shared/middleware/auth.js';
import { requireOwnProfile } from 'shared/middleware/ownProfile.js';

export const recommendationsRouter = Router();
recommendationsRouter.use(requireAuth);

// Rule-based v1: genre affinity from watch history, falling back to global
// popularity for cold-start profiles. Computed per-request at this scale;
// promote to a scheduled batch job + Redis cache once traffic makes that
// worthwhile (see docs §10).
recommendationsRouter.get('/', requireOwnProfile('query'), async (req, res, next) => {
  try {
    const profileId = req.query.profileId;
    const history = await WatchHistory.find({ profileId, contentType: 'movie' }).limit(50);
    const watchedIds = history.map((h) => h.contentId);

    const watchedMovies = await Movie.find({ _id: { $in: watchedIds } }, 'genreIds');
    const genreIds = [...new Set(watchedMovies.flatMap((m) => m.genreIds.map((g) => g.toString())))];

    let recommendations;
    if (genreIds.length > 0) {
      recommendations = await Movie.find({ genreIds: { $in: genreIds }, _id: { $nin: watchedIds }, status: 'ready' })
        .sort({ popularityScore: -1 })
        .limit(20);
    } else {
      recommendations = await Movie.find({ status: 'ready' }).sort({ popularityScore: -1 }).limit(20);
    }

    res.json(recommendations);
  } catch (err) {
    next(err);
  }
});
