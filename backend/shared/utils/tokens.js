import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../config/env.js';

export function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtAccessSecret, {
    expiresIn: env.accessTokenTtl,
  });
}

export function signRefreshToken(user) {
  return jwt.sign({ sub: user._id.toString() }, env.jwtRefreshSecret, {
    expiresIn: env.refreshTokenTtl,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtAccessSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwtRefreshSecret);
}

// Refresh tokens are stored hashed, never in plaintext - a DB leak alone
// can't be replayed into a session.
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
