import { Router } from 'express';
import { TVShow } from 'shared/models/TVShow.js';
import { Season } from 'shared/models/Season.js';
import { Episode } from 'shared/models/Episode.js';

export const showsRouter = Router();

showsRouter.get('/', async (req, res, next) => {
  try {
    const { genre, page = 1, limit = 24 } = req.query;
    const filter = {};
    if (genre) filter.genreIds = genre;
    const shows = await TVShow.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
    res.json(shows);
  } catch (err) {
    next(err);
  }
});

showsRouter.get('/:id', async (req, res, next) => {
  try {
    const show = await TVShow.findById(req.params.id).populate('genreIds');
    if (!show) return res.status(404).json({ error: 'not_found' });
    res.json(show);
  } catch (err) {
    next(err);
  }
});

showsRouter.get('/:id/seasons', async (req, res, next) => {
  try {
    const seasons = await Season.find({ showId: req.params.id }).sort({ seasonNumber: 1 });
    const seasonsWithEpisodes = await Promise.all(
      seasons.map(async (season) => ({
        ...season.toObject(),
        episodes: await Episode.find({ seasonId: season._id }).sort({ episodeNumber: 1 }),
      })),
    );
    res.json(seasonsWithEpisodes);
  } catch (err) {
    next(err);
  }
});
