import { Router } from 'express';
import { Movie } from 'shared/models/Movie.js';
import { TVShow } from 'shared/models/TVShow.js';

// Not routed through the gateway - only reachable service-to-service on
// the internal network. auth-service's admin analytics endpoint calls
// this directly (see services/auth-service/src/routes/admin.routes.js).
export const internalRouter = Router();

internalRouter.get('/stats', async (req, res, next) => {
  try {
    const [movieCount, showCount, topMovies] = await Promise.all([
      Movie.countDocuments(),
      TVShow.countDocuments(),
      Movie.find().sort({ popularityScore: -1 }).limit(5).select('title popularityScore avgRating'),
    ]);
    res.json({ movieCount, showCount, topMovies });
  } catch (err) {
    next(err);
  }
});
