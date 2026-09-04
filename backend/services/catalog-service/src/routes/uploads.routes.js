import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { requireAuth } from 'shared/middleware/auth.js';
import { upload } from 'shared/utils/uploads.js';

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 5 * 1024 * 1024;

export const uploadsRouter = Router();
uploadsRouter.use(requireAuth);

// Any signed-in user can upload an image (used for profile avatars).
// Real media uploads still go through the admin-only /admin/upload route.
uploadsRouter.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file_required' });
  if (!IMAGE_MIME.has(req.file.mimetype) || req.file.size > MAX_BYTES) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: 'image_required_max_5mb' });
  }
  res.status(201).json({ url: `/uploads/${path.basename(req.file.path)}` });
});
