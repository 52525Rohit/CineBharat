import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs';
import { env } from '../config/env.js';

const execFileAsync = promisify(execFile);

// Browsers only support WebVTT (<track kind="subtitles">) - not the far
// more commonly-distributed .srt format. Converts on upload so admins can
// just upload whatever subtitle file they have.
export async function convertToVttIfNeeded(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.srt') return filePath;

  const outputPath = filePath.slice(0, -ext.length) + '.vtt';
  try {
    await execFileAsync(env.ffmpegPath, ['-y', '-i', filePath, outputPath]);
    fs.unlinkSync(filePath);
    return outputPath;
  } catch (err) {
    console.warn(`[uploads] .srt -> .vtt conversion failed for ${path.basename(filePath)}: ${err.message}`);
    return filePath;
  }
}
