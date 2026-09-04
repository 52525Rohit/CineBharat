import { Router } from 'express';
import { Profile } from 'shared/models/Profile.js';
import { User } from 'shared/models/User.js';
import { requireAuth } from 'shared/middleware/auth.js';

export const profilesRouter = Router();
profilesRouter.use(requireAuth);

// Persists the "Who's Watching" choice server-side (on the account, in
// Mongo) instead of localStorage, so it's not tied to one browser/device
// and there's nothing sitting on the viewer's own machine.
profilesRouter.put('/active', async (req, res, next) => {
  try {
    const { profileId } = req.body;
    const profile = await Profile.findOne({ _id: profileId, userId: req.user.id });
    if (!profile) return res.status(403).json({ error: 'forbidden' });

    await User.findByIdAndUpdate(req.user.id, { lastActiveProfileId: profileId });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

profilesRouter.get('/', async (req, res, next) => {
  try {
    res.json(await Profile.find({ userId: req.user.id }));
  } catch (err) {
    next(err);
  }
});

profilesRouter.post('/', async (req, res, next) => {
  try {
    const count = await Profile.countDocuments({ userId: req.user.id });
    if (count >= 5) return res.status(400).json({ error: 'profile_limit_reached' });

    const profile = await Profile.create({
      userId: req.user.id,
      name: req.body.name,
      isKids: !!req.body.isKids,
      avatarUrl: req.body.avatarUrl ?? '',
    });
    res.status(201).json(profile);
  } catch (err) {
    next(err);
  }
});

profilesRouter.patch('/:id', async (req, res, next) => {
  try {
    // Whitelist - never let the client $set arbitrary paths (userId, _id...).
    const allowed = ['name', 'avatarUrl', 'isKids', 'phone', 'location', 'bio'];
    const update = {};
    for (const key of allowed) if (key in req.body) update[key] = req.body[key];

    const profile = await Profile.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: update },
      { new: true, runValidators: true },
    );
    if (!profile) return res.status(404).json({ error: 'not_found' });
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

profilesRouter.delete('/:id', async (req, res, next) => {
  try {
    await Profile.deleteOne({ _id: req.params.id, userId: req.user.id });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
