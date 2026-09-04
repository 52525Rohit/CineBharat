import { Router } from 'express';
import { Rating } from 'shared/models/Rating.js';
import { Movie } from 'shared/models/Movie.js';
import { TVShow } from 'shared/models/TVShow.js';
import { requireAuth } from 'shared/middleware/auth.js';
import { requireOwnProfile } from 'shared/middleware/ownProfile.js';

export const ratingsRouter = Router();
ratingsRouter.use(requireAuth);

ratingsRouter.post('/', requireOwnProfile('body'), async (req, res, next) => {
  try {
    const { profileId, contentId, contentType, value } = req.body;
    if (value < 1 || value > 5) return res.status(400).json({ error: 'value_must_be_1_to_5' });

    const rating = await Rating.findOneAndUpdate(
      { profileId, contentId },
      { profileId, contentId, contentType, value },
      { upsert: true, new: true },
    );

    const Model = contentType === 'movie' ? Movie : TVShow;
    const agg = await Rating.aggregate([
      { $match: { contentId: rating.contentId } },
      { $group: { _id: null, avg: { $avg: '$value' } } },
    ]);
    await Model.findByIdAndUpdate(contentId, { avgRating: agg[0]?.avg ?? value });

    res.status(201).json(rating);
  } catch (err) {
    next(err);
  }
});
