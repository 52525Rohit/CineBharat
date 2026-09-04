# Streamline

A working Netflix-like video streaming platform, built to the MVP tier of the architecture in the [Streaming Architecture Blueprint](https://claude.ai/code/artifact/8ee5367a-9b15-454f-8bd6-51e1fdc45d7d) (full system design: video pipeline, database, APIs, auth, subscriptions, scaling, security, DR).

> `docs/architecture.md` is an earlier, MySQL-based design from a prior session and is unrelated to the code in this repo — it's kept for reference but nothing here implements it. This README describes what actually exists.

## Architecture: microservices behind a gateway

```
frontend  ->  gateway (:4000)  ->  auth-service (:4001)
                               ->  catalog-service (:4002)
                               ->  engagement-service (:4003)
                               ->  subscription-service (:4004)
```

- **`backend/gateway/`** — the only public entry point. Reverse-proxies `/api/*` to the right downstream service (`http-proxy-middleware`) and exposes an aggregate `/api/health`. The frontend only ever talks to this process.
- **`backend/services/auth-service/`** — register/login/refresh/logout, profiles, admin user management. Its `/admin/analytics` route calls catalog-service over HTTP for catalog counts — the one deliberately-visible example of real service-to-service communication (see `services/auth-service/src/routes/admin.routes.js`).
- **`backend/services/catalog-service/`** — movies, shows/seasons/episodes, genres, search (Mongo text index), admin content CRUD (with cascade deletes for show → seasons → episodes), and the local-disk upload stand-in.
- **`backend/services/engagement-service/`** — watchlist, watch progress/history, ratings, a rule-based recommendation endpoint.
- **`backend/services/subscription-service/`** — plans and plan selection.
- **`backend/shared/`** — the one thing all five processes have in common: Mongoose models, JWT/RBAC middleware, token utils. Published as a local npm workspace package (`shared`) so every service imports it as `shared/models/User.js` etc.
- **`frontend/`** — React 18 + Vite, Tailwind CSS, Redux Toolkit (auth/session state), React Query (server state/caching). Home rails, movie/show detail pages, a video player, search, My List, a subscription picker, and an admin panel (movies, TV shows/seasons/episodes, users, analytics).

**Honest scope of "microservices" here:** every service shares one MongoDB (each only touches the collections it owns by domain) and verifies JWTs statelessly rather than calling back to auth-service — that's the pragmatic version for this scale. A DB-per-service split is the next step up if this ever needs it; the shared-DB choice is called out in `backend/shared/config/db.js`.

## Local-dev stand-ins for AWS

This repo runs with no AWS account. Each stand-in is marked in code with the production swap point:

| Local dev | Production (see architecture doc) |
| --- | --- |
| Admin file upload → local disk (`backend/uploads/`, multer, in catalog-service) | Pre-signed S3 PUT, admin uploads straight to S3 |
| No transcoding — the uploaded file is played as-is | S3 event → SQS → MediaConvert worker → HLS ladder (360p–4K) |
| Plain `<video>` tag against an MP4 URL | hls.js against a signed CloudFront `.m3u8` manifest |
| Plan/subscription fields on the Mongo user doc | Postgres billing ledger + Stripe (or equivalent) webhooks |
| No Redis — recommendations computed per-request | Redis cache for sessions, trending, entitlements, recommendations |

Seed data pulls 16 real movies and 6 real TV shows (with season 1 episodes) from **TMDB** — real titles, posters, cast, directors, ratings. Requires a free `TMDB_API_KEY` in `backend/.env` (get one at themoviedb.org/settings/api). Playback itself still uses public sample MP4s (Google's GTV test bucket) — TMDB has no streamable video, only metadata/artwork.

## Run locally

Prerequisites: Node 18+, a MongoDB instance reachable at `mongodb://127.0.0.1:27017` (or set `MONGO_URI`), a TMDB API key.

```powershell
npm install
Copy-Item backend/.env.example backend/.env   # then fill in TMDB_API_KEY
npm run seed     # creates demo catalog + accounts
npm run dev      # everything at once: gateway :4000, services :4001-4004, frontend :5173
```

`npm run dev` runs one process tree (backend + frontend together, `--kill-others` so a crash on one side takes down the other instead of leaving a stale half-running state). Split into two terminals with `npm run dev:services` / `npm run dev:frontend` if you want the backend and frontend logs separated.

For a backend without file-watching (plain `node src/server.js` per service, no `node --watch`), use `npm start` — same five services, but nothing auto-restarts on file changes, so there's no `node --watch` port-rebind race to worry about. Frontend still needs its own `npm run dev:frontend` in that case (there's no production frontend server here — see `npm run build:frontend` for a static build instead).

**If something looks broken that shouldn't be:** check `curl http://localhost:4000/api/health` first. `node --watch` (used for each service's autoreload) doesn't always release its port cleanly on Windows before restarting, which can leave a stale process still answering requests. If health check hangs or a service shows `unreachable`, stop everything (`Get-Process node | Stop-Process -Force` — safe as long as nothing unrelated to this project is also running node) and re-run `npm run dev`.

Demo accounts (created by `npm run seed`):

- `demo@streamline.dev` / `Demo1234!` — regular user, Standard plan
- `admin@streamline.dev` / `Admin123!` — admin, Premium plan

## Validate

```powershell
npm run test:backend    # node:test - JWT sign/verify/rotation
npm run build:frontend  # vite production build
curl http://localhost:4000/api/health   # aggregate health of all 5 services
```

## Next steps toward production

Follow the MVP → production table in the architecture doc: swap local disk for S3 + a presigned-upload flow, add the SQS/MediaConvert worker, move billing into a Postgres ledger with real payment-gateway webhooks, add Redis in front of the read-heavy endpoints, switch search to OpenSearch once catalog size justifies it, and split the shared MongoDB into one database per service once that boundary is actually load-bearing.
