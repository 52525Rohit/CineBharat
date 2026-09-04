import { app } from './app.js';
import { connectDB } from 'shared/config/db.js';
import { env } from 'shared/config/env.js';

await connectDB('subscription-service');
app.listen(env.subscriptionServicePort, () => console.log(`[subscription-service] listening on http://localhost:${env.subscriptionServicePort}`));
