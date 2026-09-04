import { Router } from 'express';
import { Movie } from 'shared/models/Movie.js';
import { TVShow } from 'shared/models/TVShow.js';

export const searchRouter = Router();

// MongoDB text index for MVP; swap for OpenSearch once catalog/query
// volume justifies it - see docs §11.
searchRouter.get('/', async (req, res, next) => {
  try {
    const q = (req.query.q ?? '').trim();
    if (!q) return res.json({ query: q, results: [] });

    const started = Date.now();
    const [movies, shows] = await Promise.all([
      Movie.find({ $text: { $search: q } }, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .limit(10),
      TVShow.find({ $text: { $search: q } }, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .limit(10),
    ]);

    const results = [
      ...movies.map((m) => ({ id: m._id, title: m.title, type: 'movie', year: m.releaseYear, posterUrl: m.posterUrl })),
      ...shows.map((s) => ({ id: s._id, title: s.title, type: 'show', year: s.releaseYear, posterUrl: s.posterUrl })),
    ];

    res.json({ query: q, results, total: results.length, tookMs: Date.now() - started });
  } catch (err) {
    next(err);
  }
});
