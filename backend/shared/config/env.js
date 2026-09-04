import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// One secrets file for every service - mirrors how they'd all pull the
// same keys from AWS Secrets Manager in production (see docs). This file
// itself gets copied (not symlinked) into each service's node_modules/shared
// at a different nesting depth, so we can't assume a fixed "../../.env"
// offset - walk up from wherever this copy landed until backend/.env turns up.
function findBackendDir(startDir) {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, '.env'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return startDir;
    dir = parent;
  }
  return startDir;
}
const backendDir = findBackendDir(path.dirname(fileURLToPath(import.meta.url)));
dotenv.config({ path: path.join(backendDir, '.env') });

export const env = {
  mongoUri: process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/streamline',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL ?? '30d',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  uploadDir: process.env.UPLOAD_DIR ?? path.join(backendDir, 'uploads'),
  tmdbApiKey: process.env.TMDB_API_KEY ?? '',
  ffmpegPath: process.env.FFMPEG_PATH ?? 'ffmpeg',

  gatewayPort: Number(process.env.GATEWAY_PORT ?? 4000),
  authServicePort: Number(process.env.AUTH_SERVICE_PORT ?? 4001),
  catalogServicePort: Number(process.env.CATALOG_SERVICE_PORT ?? 4002),
  engagementServicePort: Number(process.env.ENGAGEMENT_SERVICE_PORT ?? 4003),
  subscriptionServicePort: Number(process.env.SUBSCRIPTION_SERVICE_PORT ?? 4004),

  authServiceUrl: process.env.AUTH_SERVICE_URL ?? 'http://localhost:4001',
  catalogServiceUrl: process.env.CATALOG_SERVICE_URL ?? 'http://localhost:4002',
  engagementServiceUrl: process.env.ENGAGEMENT_SERVICE_URL ?? 'http://localhost:4003',
  subscriptionServiceUrl: process.env.SUBSCRIPTION_SERVICE_URL ?? 'http://localhost:4004',
};
