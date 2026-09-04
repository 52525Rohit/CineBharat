import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken, hashToken } from './tokens.js';

const fakeUser = { _id: { toString: () => 'user123' }, role: 'admin' };

test('access token round-trips claims and rejects tampering', () => {
  const token = signAccessToken(fakeUser);
  const payload = verifyAccessToken(token);
  assert.equal(payload.sub, 'user123');
  assert.equal(payload.role, 'admin');

  assert.throws(() => verifyAccessToken(token + 'x'));
});

test('refresh token verifies independently of the access-token secret', () => {
  const token = signRefreshToken(fakeUser);
  const payload = verifyRefreshToken(token);
  assert.equal(payload.sub, 'user123');
  assert.throws(() => verifyAccessToken(token), 'a refresh token must not verify as an access token');
});

test('hashToken is deterministic and one-way-looking (no plaintext leakage)', () => {
  const token = signRefreshToken(fakeUser);
  const hash1 = hashToken(token);
  const hash2 = hashToken(token);
  assert.equal(hash1, hash2);
  assert.notEqual(hash1, token);
});
