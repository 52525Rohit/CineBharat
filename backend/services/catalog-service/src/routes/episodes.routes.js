import { Router } from 'express';
import { Episode } from 'shared/models/Episode.js';
import { TVShow } from 'shared/models/TVShow.js';
import { WatchProgress } from 'shared/models/WatchProgress.js';
import { User } from 'shared/models/User.js';
import { requireAuth } from 'shared/middleware/auth.js';
import { PLAN_RANK } from 'shared/utils/plans.js';

export const episodesRouter = Router();

episodesRouter.get('/:id', async (req, res, next) => {
  try {
    const episode = await Episode.findById(req.params.id);
    if (!episode) return res.status(404).json({ error: 'not_found' });
    res.json(episode);
  } catch (err) {
    next(err);
  }
});

episodesRouter.get('/:id/playback', requireAuth, async (req, res, next) => {
  try {
    const episode = await Episode.findById(req.params.id);
    if (!episode || episode.status !== 'ready') return res.status(404).json({ error: 'not_found' });

    // Episodes don't carry their own plan tier - they inherit the parent
    // show's, same as every episode of a show sitting behind one paywall
    // tier on a real streaming service. This check didn't exist before -
    // any logged-in user could play any episode regardless of plan.
    const show = await TVShow.findById(episode.showId);
    const user = await User.findById(req.user.id);
    if (show && PLAN_RANK[user.plan] < PLAN_RANK[show.requiredPlan]) {
      return res.status(403).json({ error: 'upgrade_required', requiredPlan: show.requiredPlan });
    }

    const profileId = req.query.profileId;
    let resumePositionSec = 0;
    if (profileId) {
      const progress = await WatchProgress.findOne({ profileId, contentId: episode._id });
      resumePositionSec = progress?.positionSec ?? 0;
    }

    // Same priority as movies.routes.js: a real uploaded file always wins,
    // then an admin-pasted YouTube link, then the sample-clip fallback.
    const hasRealUpload = episode.videoUrl?.startsWith('/uploads/');
    const hasDubs = (episode.audioTracks?.length ?? 0) > 0;

    if (!hasRealUpload && !hasDubs && episode.youtubeKey) {
      return res.json({
        type: 'youtube',
        youtubeKey: episode.youtubeKey,
        title: episode.title,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });
    }

    res.json({
      type: 'sample',
      title: episode.title,
      videoUrl: episode.videoUrl,
      // See movies.routes.js: a real upload must not be shadowed by the
      // seed's stale multi-res videoQualities map.
      videoQualities: hasRealUpload ? null : episode.videoQualities || null,
      audioTracks: episode.audioTracks || [],
      manifestUrl: episode.videoUrl,
      subtitleUrl: episode.subtitleUrl || null,
      subtitleLang: episode.subtitleLang,
      resumePositionSec,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
  } catch (err) {
    next(err);
  }
});
