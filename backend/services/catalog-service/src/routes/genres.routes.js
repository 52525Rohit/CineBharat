import { Router } from 'express';
import { Genre } from 'shared/models/Genre.js';

export const genresRouter = Router();

genresRouter.get('/', async (req, res, next) => {
  try {
    res.json(await Genre.find().sort({ name: 1 }));
  } catch (err) {
    next(err);
  }
});
