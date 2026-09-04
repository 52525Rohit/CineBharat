import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from 'shared/config/env.js';
import { notFound, errorHandler } from 'shared/middleware/errorHandler.js';
import { authRouter } from './routes/auth.routes.js';
import { profilesRouter } from './routes/profiles.routes.js';
import { adminRouter } from './routes/admin.routes.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (req, res) => res.json({ service: 'auth-service', status: 'ok' }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 });
app.use('/auth', authLimiter, authRouter);
app.use('/profiles', profilesRouter);
app.use('/admin', adminRouter);

app.use(notFound);
app.use(errorHandler);
