import { app } from './app.js';
import { connectDB } from 'shared/config/db.js';
import { env } from 'shared/config/env.js';

await connectDB('catalog-service');
app.listen(env.catalogServicePort, () => console.log(`[catalog-service] listening on http://localhost:${env.catalogServicePort}`));
