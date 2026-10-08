# Nuxt + NestJS starter

[![CI](https://github.com/yartsun/nuxt-nest-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/yartsun/nuxt-nest-starter/actions/workflows/ci.yml)
![License: MIT](https://img.shields.io/badge/license-MIT-blue)

A production-shaped full-stack starter: a NestJS API, a BullMQ worker, Meilisearch, Socket.IO and a Nuxt 4
front end, wired together around a searchable, real-time catalog that you replace with your own domain.

![Catalog with instant search and category facets](docs/catalog.jpg)

## What you get

- **Auth that holds up.** Email and password hashed with scrypt. A short-lived JWT access token kept only in
  memory. A rotating refresh token in an httpOnly cookie, stored as a SHA-256 hash, one session per device; a
  replayed old token signs out every session of that user. Optional Google and GitHub sign-in with a `state`
  check and no tokens in URLs. Rate-limited sign-in endpoints.
- **Search.** Meilisearch with typo tolerance, filters, sorting and category counts that stay complete when a
  category is selected. Index settings live in code.
- **Background work.** A separate worker process consumes BullMQ queues. Database writes enqueue index updates,
  so a search outage never fails a write, and a full reindex builds a fresh index and swaps it in atomically.
- **Real time.** Socket.IO rooms: everyone gets catalog changes, only the owner gets import progress. Jobs in
  the worker reach browsers through BullMQ queue events, with no extra message bus.
- **CSV import.** Checked up front, processed in chunks by the worker, with a per-line error report, a live
  progress bar and a polling fallback.
- **Nuxt 4 front end.** Nuxt UI, a server-rendered catalog with shareable URLs, instant search, light and dark
  themes, and a fetch wrapper that refreshes the session once on a 401.
- **Tested.** 18 API unit tests, 15 end-to-end tests against real PostgreSQL, Redis and Meilisearch (sockets
  included) and 9 front-end unit tests. CI runs them all and builds the Docker images.

![CSV import with live progress and a per-line error report](docs/import.jpg)

## Architecture

```mermaid
flowchart LR
    B[Browser] -- HTTP, refresh cookie --> A[NestJS API]
    B <-- Socket.IO --> A
    B -- page requests --> N[Nuxt server]
    N -- SSR data --> A
    A --> P[(PostgreSQL)]
    A -- search --> M[(Meilisearch)]
    A -- enqueue jobs --> R[(Redis · BullMQ)]
    R --> W[Worker]
    W --> P
    W -- index --> M
    R -- queue events --> A
```

| Service | Role |
|---|---|
| `api` | REST endpoints, auth, Socket.IO gateway; produces jobs, never runs them |
| `worker` | Consumes the `search` and `import` queues; rebuilds the index if it finds it empty |
| `web` | Nuxt 4 app; renders the catalog on the server, signed-in pages in the browser |
| `migrate` | One-shot: applies Prisma migrations and seeds demo data on an empty database |

## Quick start

```bash
git clone https://github.com/yartsun/nuxt-nest-starter && cd nuxt-nest-starter
echo "JWT_SECRET=$(openssl rand -base64 48)" > .env
docker compose up --build
```

Open http://localhost:3000 and sign in as `demo@example.com` with `demo-password-123`. The demo account and 36
items are created only on an empty database; set `SEED_DEMO=false` to skip them. If ports 3000 or 3001 are taken,
set `WEB_PORT`, `API_PORT`, `WEB_URL` and `API_URL` in `.env` (see `.env.example`).

To try the real-time part, open the catalog in two windows and add an item in one of them.

## Local development

```bash
docker compose up -d postgres redis meilisearch     # infrastructure only

cd api && cp .env.example .env && npm ci
npx prisma migrate dev && npm run db:seed
npm run start:dev                                   # API on http://localhost:3001
npm run worker:dev                                  # worker, in a second terminal

cd web && npm ci && npm run dev                     # http://localhost:3000
```

Tests:

```bash
cd api && npm test                                  # unit
cd api && npm run test:e2e                          # needs the infrastructure above and a starter_test database
cd web && npm test && npm run typecheck
```

For the end-to-end suite, create the test database once:
`docker compose exec postgres createdb -U starter starter_test`, then
`DATABASE_URL=postgresql://starter:starter@localhost:5432/starter_test npx prisma migrate deploy`.

## API

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register`, `/auth/login` | – | Returns an access token and sets the refresh cookie |
| POST | `/auth/refresh` | cookie | Rotates the refresh cookie, returns a new access token |
| POST | `/auth/logout` | cookie | Revokes the session |
| GET | `/auth/me` | bearer | Current user |
| GET | `/auth/providers` | – | Which OAuth providers are configured |
| GET | `/auth/google`, `/auth/github` | – | OAuth sign-in (404 when not configured) |
| GET | `/items`, `/items/:id` | – | Keyset-paginated list, single item |
| POST, PATCH, DELETE | `/items`, `/items/:id` | bearer | Create; change and delete by the owner only |
| GET | `/search` | – | `q`, `category`, `inStock`, `minPrice`, `maxPrice`, `sort`, `limit`, `offset` |
| POST | `/imports` | bearer | Queue a CSV import, returns `jobId` |
| GET | `/imports/:id` | bearer | Import status (polling fallback) |
| GET | `/health` | – | PostgreSQL, Redis and Meilisearch checks; 503 if any is down |

Socket.IO namespace `/realtime`: `item.created`, `item.updated`, `item.deleted` and `search.updated` for everyone;
`import.progress`, `import.completed` and `import.failed` for the owner, who passes the access token in the
handshake `auth` payload.

## Design notes

- **The refresh token is opaque, not a JWT.** It is `<sessionId>.<random secret>`, and only the hash of the secret
  is stored, so a database leak does not hand out sessions and a session can be revoked on the spot. A rotated
  token presented within 10 seconds is treated as a parallel refresh from another tab, not as theft.
- **OAuth never puts tokens in the URL.** The callback sets the refresh cookie and redirects to the web app,
  which exchanges the cookie for an access token. Accounts are not auto-linked by email.
- **Writes go through the queue to reach search.** Indexing is retried by BullMQ, the API stays fast, and the
  `search.updated` event tells clients to refetch once the index has actually changed.
- **Signed-in pages render in the browser.** The session lives in an httpOnly cookie scoped to the API, so the
  public catalog is server-rendered and the rest is client-only; no session is copied into the Nuxt server.

## Make it yours

Replace the catalog with your entity in five places: the Prisma model (`api/prisma/schema.prisma`), the items
module (`api/src/items`), the search document and index settings (`api/src/search/meili.service.ts`), the CSV
columns (`api/src/imports/csv.ts`) and the pages in `web/app/pages`.

## Stack

NestJS 11 · Prisma 6 · PostgreSQL 16 · BullMQ 5 · Redis 7 · Meilisearch 1.13 · Socket.IO 4 · Nuxt 4 · Nuxt UI 4 ·
Pinia · TypeScript 5 · Jest · Vitest · Docker Compose · GitHub Actions

## License

[MIT](LICENSE)
