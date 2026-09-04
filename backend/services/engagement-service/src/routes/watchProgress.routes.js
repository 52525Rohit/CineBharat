import { Router } from 'express';
import { WatchProgress } from 'shared/models/WatchProgress.js';
import { WatchHistory } from 'shared/models/WatchHistory.js';
import { Movie } from 'shared/models/Movie.js';
import { Episode } from 'shared/models/Episode.js';
import { requireAuth } from 'shared/middleware/auth.js';
import { requireOwnProfile } from 'shared/middleware/ownProfile.js';

async function withContentMeta(rows) {
  const movieIds = rows.filter((r) => r.contentType === 'movie').map((r) => r.contentId);
  const episodeIds = rows.filter((r) => r.contentType === 'episode').map((r) => r.contentId);
  const [movies, episodes] = await Promise.all([
    Movie.find({ _id: { $in: movieIds } }, 'title posterUrl thumbnailUrl durationSec'),
    Episode.find({ _id: { $in: episodeIds } }, 'title thumbnailUrl durationSec'),
  ]);
  const byId = new Map([...movies, ...episodes].map((doc) => [doc._id.toString(), doc]));
  return rows.map((row) => {
    const content = byId.get(row.contentId.toString());
    return {
      ...row.toObject(),
      title: content?.title ?? 'Untitled',
      posterUrl: content?.posterUrl ?? content?.thumbnailUrl ?? '',
      thumbnailUrl: content?.thumbnailUrl ?? '',
    };
  });
}

export const watchProgressRouter = Router();
watchProgressRouter.use(requireAuth);

// Heartbeat during playback - upserts, so there's exactly one progress
// row per (profile, title) - see docs §06.
watchProgressRouter.post('/', requireOwnProfile('body'), async (req, res, next) => {
  try {
    const { profileId, contentId, contentType, positionSec, durationSec } = req.body;
    const progress = await WatchProgress.findOneAndUpdate(
      { profileId, contentId },
      { profileId, contentId, contentType, positionSec, durationSec },
      { upsert: true, new: true },
    );

    const completed = durationSec > 0 && positionSec / durationSec >= 0.9;
    if (completed) {
      await WatchHistory.create({ profileId, contentId, contentType, completed: true });
    }

    res.json(progress);
  } catch (err) {
    next(err);
  }
});

export const continueWatchingRouter = Router();
continueWatchingRouter.use(requireAuth);

continueWatchingRouter.get('/', requireOwnProfile('query'), async (req, res, next) => {
  try {
    const items = await WatchProgress.find({
      profileId: req.query.profileId,
      $expr: { $lt: ['$positionSec', { $multiply: ['$durationSec', 0.9] }] },
    }).sort({ updatedAt: -1 });
    res.json(await withContentMeta(items));
  } catch (err) {
    next(err);
  }
});

export const watchHistoryRouter = Router();
watchHistoryRouter.use(requireAuth);

watchHistoryRouter.get('/', requireOwnProfile('query'), async (req, res, next) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const items = await WatchHistory.find({ profileId: req.query.profileId })
      .sort({ watchedAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
    res.json(await withContentMeta(items));
  } catch (err) {
    next(err);
  }
});
