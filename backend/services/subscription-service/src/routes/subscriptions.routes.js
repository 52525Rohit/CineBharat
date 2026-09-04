import { Router } from 'express';
import { User } from 'shared/models/User.js';
import { requireAuth } from 'shared/middleware/auth.js';
import { PLAN_RANK } from 'shared/utils/plans.js';

export const subscriptionsRouter = Router();
subscriptionsRouter.use(requireAuth);

const PLANS = [
  { id: 'free', name: 'Free', priceCents: 0, maxResolution: '480p', maxStreams: 1 },
  { id: 'basic', name: 'Basic', priceCents: 899, maxResolution: '720p', maxStreams: 1 },
  { id: 'standard', name: 'Standard', priceCents: 1399, maxResolution: '1080p', maxStreams: 2 },
  { id: 'premium', name: 'Premium', priceCents: 1999, maxResolution: '4K', maxStreams: 4 },
];

subscriptionsRouter.get('/plans', (req, res) => res.json(PLANS));

// MVP: plan lives on the user doc (owned by auth-service's domain, but
// this is the one write subscription-service makes into it - a pragmatic
// shared-DB trade rather than an internal HTTP call for a single field).
// Production replaces this with a Postgres billing ledger + payment
// gateway webhooks - see docs §09/§21.
subscriptionsRouter.post('/', async (req, res, next) => {
  try {
    const { planId } = req.body;
    if (!(planId in PLAN_RANK)) return res.status(400).json({ error: 'invalid_plan' });

    const user = await User.findByIdAndUpdate(req.user.id, { plan: planId }, { new: true });
    const plan = PLANS.find((p) => p.id === planId);
    res.status(201).json({ plan: user.plan, maxResolution: plan.maxResolution, maxStreams: plan.maxStreams });
  } catch (err) {
    next(err);
  }
});
