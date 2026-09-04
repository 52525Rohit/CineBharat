import { test } from 'node:test';
import assert from 'node:assert/strict';
import { remuxToMp4IfNeeded } from './videoRemux.js';

test('files already in a browser-playable container pass through untouched (no ffmpeg call)', async () => {
  assert.equal(await remuxToMp4IfNeeded('/uploads/movie.mp4'), '/uploads/movie.mp4');
  assert.equal(await remuxToMp4IfNeeded('/uploads/movie.webm'), '/uploads/movie.webm');
});
