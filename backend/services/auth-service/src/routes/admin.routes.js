import { Router } from 'express';
import axios from 'axios';
import { User } from 'shared/models/User.js';
import { requireAuth, requireRole } from 'shared/middleware/auth.js';
import { env } from 'shared/config/env.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('admin'));

adminRouter.get('/users', async (req, res, next) => {
  try {
    res.json(await User.find({}, '-passwordHash -refreshTokenHash').sort({ createdAt: -1 }));
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/users/:id', async (req, res, next) => {
  try {
    const { status, role } = req.body;
    const update = {};
    if (status) update.status = status;
    if (role) update.role = role;
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, fields: '-passwordHash -refreshTokenHash' });
    if (!user) return res.status(404).json({ error: 'not_found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// Cross-service call: user/plan stats live here, catalog stats live in
// catalog-service. This is the one place the two talk to each other over
// HTTP rather than sharing a model - a deliberately visible example of
// real service-to-service communication (docs §04, "how services talk").
adminRouter.get('/analytics', async (req, res, next) => {
  try {
    const [userCount, planCounts, catalogStats] = await Promise.all([
      User.countDocuments(),
      User.aggregate([{ $group: { _id: '$plan', count: { $sum: 1 } } }]),
      axios
        .get(`${env.catalogServiceUrl}/internal/stats`)
        .then((r) => r.data)
        .catch(() => ({ movieCount: null, showCount: null, topMovies: [], serviceUnavailable: true })),
    ]);
    res.json({ userCount, planCounts, ...catalogStats });
  } catch (err) {
    next(err);
  }
});
