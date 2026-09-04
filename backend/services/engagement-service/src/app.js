import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from 'shared/config/env.js';
import { notFound, errorHandler } from 'shared/middleware/errorHandler.js';
import { watchlistRouter } from './routes/watchlist.routes.js';
import { watchProgressRouter, continueWatchingRouter, watchHistoryRouter } from './routes/watchProgress.routes.js';
import { ratingsRouter } from './routes/ratings.routes.js';
import { recommendationsRouter } from './routes/recommendations.routes.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ service: 'engagement-service', status: 'ok' }));

app.use('/watchlist', watchlistRouter);
app.use('/watch-progress', watchProgressRouter);
app.use('/continue-watching', continueWatchingRouter);
app.use('/watch-history', watchHistoryRouter);
app.use('/ratings', ratingsRouter);
app.use('/recommendations', recommendationsRouter);

app.use(notFound);
app.use(errorHandler);
