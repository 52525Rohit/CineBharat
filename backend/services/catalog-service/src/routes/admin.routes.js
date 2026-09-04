import { Router } from 'express';
import { Movie } from 'shared/models/Movie.js';
import { TVShow } from 'shared/models/TVShow.js';
import { Season } from 'shared/models/Season.js';
import { Episode } from 'shared/models/Episode.js';
import { Genre } from 'shared/models/Genre.js';
import path from 'node:path';
import { requireAuth, requireRole } from 'shared/middleware/auth.js';
import { upload } from 'shared/utils/uploads.js';
import { remuxToMp4IfNeeded } from 'shared/utils/videoRemux.js';
import { convertToVttIfNeeded } from 'shared/utils/subtitleConvert.js';

const SUBTITLE_EXTENSIONS = new Set(['.srt', '.vtt']);

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('admin'));

function crud(router, path, Model, { skipDelete = false } = {}) {
  router.post(path, async (req, res, next) => {
    try {
      res.status(201).json(await Model.create(req.body));
    } catch (err) {
      next(err);
    }
  });
  router.put(`${path}/:id`, async (req, res, next) => {
    try {
      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!doc) return res.status(404).json({ error: 'not_found' });
      res.json(doc);
    } catch (err) {
      next(err);
    }
  });
  if (!skipDelete) {
    router.delete(`${path}/:id`, async (req, res, next) => {
      try {
        await Model.findByIdAndDelete(req.params.id);
        res.status(204).end();
      } catch (err) {
        next(err);
      }
    });
  }
}

crud(adminRouter, '/movies', Movie);
crud(adminRouter, '/shows', TVShow, { skipDelete: true });
crud(adminRouter, '/seasons', Season, { skipDelete: true });
crud(adminRouter, '/episodes', Episode);
crud(adminRouter, '/genres', Genre);

// Cascade deletes so removing a show/season doesn't orphan its children.
adminRouter.delete('/shows/:id', async (req, res, next) => {
  try {
    await Episode.deleteMany({ showId: req.params.id });
    await Season.deleteMany({ showId: req.params.id });
    await TVShow.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/seasons/:id', async (req, res, next) => {
  try {
    await Episode.deleteMany({ seasonId: req.params.id });
    await Season.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/genres', async (req, res, next) => {
  try {
    res.json(await Genre.find().sort({ name: 1 }));
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/upload', upload.single('file'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'file_required' });
  try {
    const ext = path.extname(req.file.path).toLowerCase();
    const finalPath = SUBTITLE_EXTENSIONS.has(ext)
      ? await convertToVttIfNeeded(req.file.path)
      : await remuxToMp4IfNeeded(req.file.path);
    res.status(201).json({ url: `/uploads/${path.basename(finalPath)}` });
  } catch (err) {
    next(err);
  }
});
