import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'node:path';
import { env } from 'shared/config/env.js';
import { notFound, errorHandler } from 'shared/middleware/errorHandler.js';
import { moviesRouter } from './routes/movies.routes.js';
import { showsRouter } from './routes/shows.routes.js';
import { episodesRouter } from './routes/episodes.routes.js';
import { searchRouter } from './routes/search.routes.js';
import { genresRouter } from './routes/genres.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { uploadsRouter } from './routes/uploads.routes.js';
import { internalRouter } from './routes/internal.routes.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ service: 'catalog-service', status: 'ok' }));

app.use('/movies', moviesRouter);
app.use('/shows', showsRouter);
app.use('/episodes', episodesRouter);
app.use('/search', searchRouter);
app.use('/genres', genresRouter);
app.use('/admin', adminRouter);
app.use('/upload', uploadsRouter);
app.use('/internal', internalRouter);

// Local stand-in for CloudFront-served media - see shared/utils/uploads.js
app.use('/uploads', express.static(path.resolve(env.uploadDir)));

app.use(notFound);
app.use(errorHandler);
