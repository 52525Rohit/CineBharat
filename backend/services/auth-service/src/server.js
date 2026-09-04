import { app } from './app.js';
import { connectDB } from 'shared/config/db.js';
import { env } from 'shared/config/env.js';

await connectDB('auth-service');
app.listen(env.authServicePort, () => console.log(`[auth-service] listening on http://localhost:${env.authServicePort}`));
