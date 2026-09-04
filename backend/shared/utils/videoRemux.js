import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs';
import { env } from '../config/env.js';

const execFileAsync = promisify(execFile);

// Browsers only play MP4/WebM natively in a <video> tag - a container
// like MKV/AVI/MOV gets rejected outright regardless of the codec inside.
const CONTAINERS_NEEDING_REMUX = new Set(['.mkv', '.avi', '.mov', '.flv', '.wmv', '.m4v']);

// Repackages (not re-encodes) into MP4 with ffmpeg's stream copy - fast
// (seconds to a couple minutes even for a multi-GB file, since it's not
// touching the actual video/audio data, just the container) and lossless.
// Falls back to keeping the original file if ffmpeg isn't installed or
// the remux fails (a small number of MKV codec combinations aren't valid
// inside an MP4 container and would need a real re-encode, which this
// intentionally doesn't attempt - see docs, MediaConvert is the real fix).
export async function remuxToMp4IfNeeded(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!CONTAINERS_NEEDING_REMUX.has(ext)) return filePath;

  const outputPath = filePath.slice(0, -ext.length) + '.mp4';
  try {
    await execFileAsync(env.ffmpegPath, ['-y', '-i', filePath, '-c', 'copy', '-movflags', '+faststart', outputPath]);
    fs.unlinkSync(filePath);
    return outputPath;
  } catch (err) {
    console.warn(`[uploads] remux to mp4 failed for ${path.basename(filePath)}, keeping original container: ${err.message}`);
    return filePath;
  }
}
