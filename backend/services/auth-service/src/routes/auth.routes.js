import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from 'shared/models/User.js';
import { Profile } from 'shared/models/Profile.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } from 'shared/utils/tokens.js';

export const authRouter = Router();

authRouter.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || password.length < 8) {
      return res.status(400).json({ error: 'email and an 8+ character password are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'email_already_registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash });
    await Profile.create({ userId: user._id, name: name || 'Me' });

    res.status(201).json({ id: user._id, email: user.email });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email ?? '').toLowerCase() });
    if (!user || !(await bcrypt.compare(password ?? '', user.passwordHash))) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    if (user.status !== 'active') return res.status(403).json({ error: 'account_suspended' });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    const profiles = await Profile.find({ userId: user._id });
    res.json({
      accessToken,
      user: { id: user._id, email: user.email, role: user.role, plan: user.plan, lastActiveProfileId: user.lastActiveProfileId },
      profiles,
    });
  } catch (err) {
    next(err);
  }
});

// Refresh-token rotation: every call invalidates the presented token and
// issues a new one. Reuse of an already-rotated token is treated as theft
// and the session is killed - see docs §08.
authRouter.post('/refresh-token', async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: 'no_refresh_token' });

    const payload = verifyRefreshToken(token);
    const user = await User.findById(payload.sub);
    if (!user || user.refreshTokenHash !== hashToken(token)) {
      if (user) {
        user.refreshTokenHash = null;
        await user.save();
      }
      return res.status(401).json({ error: 'refresh_token_reused_or_invalid' });
    }

    const newRefreshToken = signRefreshToken(user);
    user.refreshTokenHash = hashToken(newRefreshToken);
    await user.save();

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    // Also return user (not just the token) so the frontend can fully
    // rehydrate a session from just the refresh cookie on page load,
    // without a separate round trip - see lib/bootstrapSession.js.
    res.json({
      accessToken: signAccessToken(user),
      user: { id: user._id, email: user.email, role: user.role, plan: user.plan, lastActiveProfileId: user.lastActiveProfileId },
    });
  } catch {
    res.status(401).json({ error: 'invalid_or_expired_refresh_token' });
  }
});

authRouter.post('/logout', async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await User.findByIdAndUpdate(payload.sub, { refreshTokenHash: null });
    } catch {
      // token already invalid - nothing to revoke
    }
  }
  res.clearCookie('refreshToken');
  res.status(204).end();
});
