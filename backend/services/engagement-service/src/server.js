import { app } from './app.js';
import { connectDB } from 'shared/config/db.js';
import { env } from 'shared/config/env.js';

await connectDB('engagement-service');
app.listen(env.engagementServicePort, () => console.log(`[engagement-service] listening on http://localhost:${env.engagementServicePort}`));
