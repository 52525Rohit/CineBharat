import { Profile } from "../models/Profile.js";

export function requireOwnProfile(source = "body") {
  return async (req, res, next) => {
    try {
      const profileId =
        source === "query" ? req.query.profileId : req.body.profileId;
      if (!profileId)
        return res.status(400).json({ error: "profileId_required" });

      const profile = await Profile.findOne({
        _id: profileId,
        userId: req.user.id,
      });
      if (!profile) return res.status(403).json({ error: "forbidden" });

      next();
    } catch (err) {
      next(err);
    }
  };
}
