import { Router } from 'express';
import { Watchlist } from 'shared/models/Watchlist.js';
import { Movie } from 'shared/models/Movie.js';
import { TVShow } from 'shared/models/TVShow.js';
import { requireAuth } from 'shared/middleware/auth.js';
import { requireOwnProfile } from 'shared/middleware/ownProfile.js';

export const watchlistRouter = Router();
watchlistRouter.use(requireAuth);

// contentId is polymorphic (movie or show); batch-fetch each type rather
// than a join collection - see docs §06.
async function withContentMeta(rows) {
  const movieIds = rows.filter((r) => r.contentType === 'movie').map((r) => r.contentId);
  const showIds = rows.filter((r) => r.contentType === 'show').map((r) => r.contentId);
  const [movies, shows] = await Promise.all([
    Movie.find({ _id: { $in: movieIds } }, 'title posterUrl releaseYear'),
    TVShow.find({ _id: { $in: showIds } }, 'title posterUrl releaseYear'),
  ]);
  const byId = new Map([...movies, ...shows].map((doc) => [doc._id.toString(), doc]));
  return rows.map((row) => {
    const content = byId.get(row.contentId.toString());
    return { ...row.toObject(), title: content?.title ?? 'Untitled', posterUrl: content?.posterUrl ?? '', releaseYear: content?.releaseYear };
  });
}

watchlistRouter.get('/', requireOwnProfile('query'), async (req, res, next) => {
  try {
    const items = await Watchlist.find({ profileId: req.query.profileId }).sort({ addedAt: -1 });
    res.json(await withContentMeta(items));
  } catch (err) {
    next(err);
  }
});

watchlistRouter.post('/', requireOwnProfile('body'), async (req, res, next) => {
  try {
    const { profileId, contentId, contentType } = req.body;
    const item = await Watchlist.findOneAndUpdate(
      { profileId, contentId },
      { profileId, contentId, contentType, addedAt: new Date() },
      { upsert: true, new: true },
    );
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

watchlistRouter.delete('/:contentId', requireOwnProfile('query'), async (req, res, next) => {
  try {
    await Watchlist.deleteOne({ profileId: req.query.profileId, contentId: req.params.contentId });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
