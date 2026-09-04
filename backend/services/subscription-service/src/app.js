import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from 'shared/config/env.js';
import { notFound, errorHandler } from 'shared/middleware/errorHandler.js';
import { subscriptionsRouter } from './routes/subscriptions.routes.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ service: 'subscription-service', status: 'ok' }));
app.use('/subscriptions', subscriptionsRouter);

app.use(notFound);
app.use(errorHandler);
