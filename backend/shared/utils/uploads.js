import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { env } from "../config/env.js";

fs.mkdirSync(env.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: env.uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 * 1024 },
});
