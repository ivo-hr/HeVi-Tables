# HeVi Tables

HeVi Tables is a private, mobile-first PWA for running predictions, friendly
bets, and competitions. Friends can create custom tables, draw a cover, assign
participants to entries, close the result under a predefined scoring system,
and compare weekly, monthly, or all-time leaderboards.

## Features

- Next.js 16 App Router application written in TypeScript.
- Email/password and GitHub authentication through Supabase Auth.
- Touch- and mouse-friendly drawing canvas with quadratic Bézier smoothing,
  four colors, undo, clear, and PNG export.
- Three scoring systems:
  - `WtA` — one entry receives all available points.
  - `Pod` — uses `maxPoint - ((position - 1) * 2)`, clamped at zero.
  - `EC` — points are assigned manually between zero and the table maximum.
- Rows can contain multiple participants, stored as PostgreSQL UUID arrays.
- Atomic and irreversible table closing inside PostgreSQL.
- Global and per-table leaderboards for the last 7 days, last 30 days, or all
  recorded history.
- User profiles and avatar uploads.
- PostgreSQL Row Level Security, column-level grants, Storage policies, file
  limits, validation triggers, and performance indexes.
- Installable PWA manifest, generated icons, static asset caching, and an
  offline fallback.
- Protected database healthcheck for low-traffic development deployments.
- Automated linting, type checking, tests, dependency auditing, and production
  builds.

## Technology

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Web application | Next.js App Router and React | Server-rendered pages, client interactions, Server Actions, and API routes |
| Language | TypeScript | Domain types, validation, UI, and server code |
| Authentication | Supabase Auth | Email/password sessions and GitHub OAuth |
| Database | Supabase PostgreSQL | Profiles, tables, rows, scoring, and leaderboard aggregation |
| File storage | Supabase Storage | Avatars and custom table cover drawings |
| Validation | Zod and PostgreSQL | Fast UI feedback plus authoritative database checks |
| Testing | Vitest | Scoring rule unit tests |
| Deployment | Vercel | Preview deployments from `dev` and production from `main` |
| Continuous integration | GitHub Actions | Quality checks on pushes and pull requests |

## Requirements

- Node.js 22 or newer.
- npm.
- Docker Engine/Desktop or another Docker-compatible runtime for fully local
  development.
- A hosted Supabase project only when testing against Supabase Cloud.

The repository includes `.nvmrc` and `.node-version`, both set to Node.js 22.
Supabase CLI is installed as a pinned development dependency.

## Fully local quick start

The complete stack can run on your machine. No Supabase account, cloud project,
or `.env.local` file is required.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start Docker Engine/Desktop.

3. Start local PostgreSQL, Auth, Storage, Studio, and Next.js:

   ```bash
   npm run dev:local
   ```

   The first run downloads the Supabase Docker images, applies all repository
   migrations, and can take several minutes.

4. Open:

   - Application: `http://localhost:3000`
   - Supabase Studio: `http://localhost:54323`

`dev:local` reads the local API URL and anonymous key from Supabase CLI and
injects them into the Next.js process. It never creates or overwrites
`.env.local`.

When finished:

```bash
npm run db:stop
```

Local database data is preserved across normal stops. To erase local data and
reapply every migration and seed:

```bash
npm run db:reset
```

To display every local URL, including the development email inbox:

```bash
npm run db:status
```

Do not expose the local Supabase ports to the public internet. The local stack
uses development credentials and is not hardened for production.

## Hosted Supabase setup

Use this workflow when connecting the application to Supabase Cloud.

1. Create the local environment file:

   ```bash
   cp .env.example .env.local
   ```

2. Open **Supabase > Project settings > API** and fill in:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   HEALTHCHECK_SECRET=<long-random-value>
   ```

   The PostgreSQL password is not a frontend variable. Do not add it to
   `.env.local`, source files, commits, issues, or logs.

3. Apply
   [`supabase/migrations/20260731000000_initial_schema.sql`](supabase/migrations/20260731000000_initial_schema.sql).
   It can be pasted into Supabase SQL Editor or applied with the CLI:

   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   supabase db push
   ```

4. In **Supabase > Authentication > URL Configuration**, add:

   - Site URL: `http://localhost:3000`
   - Redirect URL: `http://localhost:3000/auth/callback`

   Enable the GitHub provider and configure its OAuth credentials if GitHub
   login is required. Email/password login works independently.

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open `http://localhost:3000`.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Starts the Next.js development server |
| `npm run dev:local` | Starts local Supabase, injects its credentials, and starts Next.js |
| `npm run build` | Creates and validates an optimized production build |
| `npm run start` | Serves the latest production build |
| `npm run db:start` | Starts the local Supabase Docker stack |
| `npm run db:stop` | Stops local Supabase while preserving its data |
| `npm run db:status` | Displays local service URLs and development credentials |
| `npm run db:reset` | Recreates the local database from migrations and seed data |
| `npm run lint` | Runs ESLint across JavaScript and TypeScript files |
| `npm run typecheck` | Runs TypeScript without emitting files |
| `npm run test` | Runs all Vitest tests once |
| `npm run test:watch` | Runs Vitest in watch mode |
| `npm run check` | Runs lint, type checking, tests, and the production build |

## How the application works

### Authentication

Supabase stores the session in cookies. `proxy.ts` refreshes those cookies and
protects application routes. The server retrieves the authenticated user before
reading or mutating private data. A profile is created automatically by a
database trigger when an Auth user is registered.

### Table creation

The browser records normalized drawing strokes and redraws them as smooth
quadratic Bézier curves. On submission, the canvas is exported as PNG and sent
to a Server Action. The action validates the file, uploads it under the
authenticated user's Storage folder, creates the table, and removes the upload
again if the database insert fails.

### Rows and participants

Only the creator of an open table can add, update, or delete rows. Each row
stores one or more profile IDs in `user_ids`. The database rejects empty arrays,
duplicate IDs, nonexistent profiles, values incompatible with the selected
scoring system, and all edits after closing.

### Closing and scoring

The `close_table` PostgreSQL function is the authoritative scoring engine. It
locks the table, checks ownership and rule validity, calculates every
`points_won` value, and marks the table as closed in one transaction. Clients
cannot directly write `points_won`, `closed`, or `closed_date`.

### Leaderboards

`get_leaderboard` expands each row's UUID array, joins it to profiles, filters
closed tables by date and optional table ID, and returns accumulated points and
the number of scored tables per user.

### PWA and offline behavior

The manifest and icons are generated by Next.js. The service worker caches only
versioned static assets, icons, and the offline page. It deliberately does not
cache authenticated HTML, API responses, or leaderboard data.

## Repository map

### Root configuration and documentation

| Path | Purpose |
| --- | --- |
| [`README.md`](README.md) | Project overview, setup, architecture, deployment, and repository reference |
| [`SECURITY.md`](SECURITY.md) | Vulnerability reporting and secret-handling rules |
| [`LICENSE.md`](LICENSE.md) | Repository license terms |
| [`.env.example`](.env.example) | Safe template for the required runtime variables; contains no real credentials |
| [`.gitignore`](.gitignore) | Excludes dependencies, builds, local environment files, caches, and provider state |
| [`.nvmrc`](.nvmrc) | Selects Node.js 22 for nvm |
| [`.node-version`](.node-version) | Selects Node.js 22 for version managers such as asdf or mise |
| [`package.json`](package.json) | npm scripts, runtime dependencies, development dependencies, Node requirement, and security overrides |
| [`package-lock.json`](package-lock.json) | Reproducible, exact npm dependency tree |
| [`tsconfig.json`](tsconfig.json) | Strict TypeScript and `@/*` path-alias configuration |
| [`next-env.d.ts`](next-env.d.ts) | Next.js-generated TypeScript declarations |
| [`next.config.ts`](next.config.ts) | Next.js security headers, service-worker headers, and runtime settings |
| [`eslint.config.mjs`](eslint.config.mjs) | Flat ESLint 10 configuration for JavaScript and TypeScript |
| [`vitest.config.mts`](vitest.config.mts) | Vitest test discovery, Node environment, and import alias |
| [`proxy.ts`](proxy.ts) | Next.js request entry point that delegates session refresh and route protection |
| [`scripts/dev-local.mjs`](scripts/dev-local.mjs) | Checks Docker, starts Supabase, reads local credentials, and launches Next.js without writing an environment file |

### GitHub automation

| Path | Purpose |
| --- | --- |
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | Installs with `npm ci` and runs lint, type checking, tests, and build on `dev`/`main` pushes and pull requests |

### Application routes and layouts

| Path | Purpose |
| --- | --- |
| [`app/layout.tsx`](app/layout.tsx) | Root HTML layout, global metadata, viewport settings, CSS, and service-worker registration |
| [`app/globals.css`](app/globals.css) | Complete visual system, responsive layouts, form states, mobile navigation, and reduced-motion support |
| [`app/(app)/layout.tsx`](app/(app)/layout.tsx) | Shared authenticated application shell and current profile lookup |
| [`app/(app)/loading.tsx`](app/(app)/loading.tsx) | Loading state shared by authenticated pages |
| [`app/(app)/page.tsx`](app/(app)/page.tsx) | Dashboard with period/table filters, personal score, leaderboard, and recent tables |
| [`app/(app)/perfil/page.tsx`](app/(app)/perfil/page.tsx) | Profile and avatar management page |
| [`app/(app)/tablas/nueva/page.tsx`](app/(app)/tablas/nueva/page.tsx) | New-table page containing the drawing and configuration workflow |
| [`app/(app)/tablas/[id]/page.tsx`](app/(app)/tablas/[id]/page.tsx) | Table detail, rule summary, participant rows, editing permissions, and final results |
| [`app/login/page.tsx`](app/login/page.tsx) | Public sign-in and registration page |
| [`app/offline/page.tsx`](app/offline/page.tsx) | Offline fallback displayed when navigation cannot reach the server |
| [`app/not-found.tsx`](app/not-found.tsx) | Application-wide not-found state |

The `(app)` directory is a route group. Its name organizes protected pages but
does not appear in their public URLs.

### Server Actions

| Path | Purpose |
| --- | --- |
| [`app/actions/auth.ts`](app/actions/auth.ts) | Server-side sign-out and redirect |
| [`app/actions/profile.ts`](app/actions/profile.ts) | Profile validation, avatar upload, and profile update |
| [`app/actions/tables.ts`](app/actions/tables.ts) | Table creation, PNG upload, row CRUD, authorization checks, and atomic close RPC invocation |

### Route handlers and generated PWA assets

| Path | Purpose |
| --- | --- |
| [`app/auth/callback/route.ts`](app/auth/callback/route.ts) | Exchanges Supabase PKCE/OAuth codes for cookie-backed sessions and performs safe redirects |
| [`app/api/health/route.ts`](app/api/health/route.ts) | Protected healthcheck that verifies PostgreSQL availability without exposing data |
| [`app/manifest.ts`](app/manifest.ts) | Generates `manifest.webmanifest` for PWA installation |
| [`app/icons/[size]/route.tsx`](app/icons/[size]/route.tsx) | Generates 192×192 and 512×512 PNG application icons |
| [`app/apple-icon.tsx`](app/apple-icon.tsx) | Generates the Apple touch icon |

### Reusable UI components

| Path | Purpose |
| --- | --- |
| [`components/app-shell.tsx`](components/app-shell.tsx) | Desktop header, mobile navigation, profile summary, and sign-out control |
| [`components/auth-form.tsx`](components/auth-form.tsx) | Client-side email login, registration, GitHub OAuth, and auth feedback |
| [`components/avatar.tsx`](components/avatar.tsx) | Avatar image with an initials fallback |
| [`components/configuration-needed.tsx`](components/configuration-needed.tsx) | Safe setup screen shown when public Supabase variables are missing |
| [`components/create-table-form.tsx`](components/create-table-form.tsx) | Coordinates table settings, canvas export, file creation, submission, and errors |
| [`components/drawing-canvas.tsx`](components/drawing-canvas.tsx) | Pointer input, normalized strokes, Bézier smoothing, color palette, undo, clear, resize, and PNG export |
| [`components/leaderboard.tsx`](components/leaderboard.tsx) | Ranked user list, medals, scores, avatars, and empty state |
| [`components/profile-form.tsx`](components/profile-form.tsx) | Profile name and avatar upload form backed by a Server Action |
| [`components/row-editor.tsx`](components/row-editor.tsx) | Editable/read-only row views, participant selection, conditional rule inputs, deletion, and table closing |
| [`components/service-worker-register.tsx`](components/service-worker-register.tsx) | Registers the service worker in production-capable browsers |
| [`components/table-card.tsx`](components/table-card.tsx) | Reusable table preview with cover, state, scoring system, and dates |

### Domain and utility modules

| Path | Purpose |
| --- | --- |
| [`lib/types.ts`](lib/types.ts) | Domain models, action result types, scoring enum, and typed Supabase database contract |
| [`lib/validation.ts`](lib/validation.ts) | Zod schemas for tables, rows, profiles, and credentials |
| [`lib/rules.ts`](lib/rules.ts) | Pure TypeScript implementation of WtA, Pod, and EC calculations for testable rule behavior |
| [`lib/rules.test.ts`](lib/rules.test.ts) | Tests successful calculations, clamping, validation failures, and input immutability |
| [`lib/format.ts`](lib/format.ts) | Spanish locale date/point formatting, initials, and scoring-system labels |

### Supabase client modules

| Path | Purpose |
| --- | --- |
| [`lib/supabase/config.ts`](lib/supabase/config.ts) | Detects missing configuration and returns validated public Supabase settings |
| [`lib/supabase/client.ts`](lib/supabase/client.ts) | Singleton browser client for authentication and client-side operations |
| [`lib/supabase/server.ts`](lib/supabase/server.ts) | Cookie-aware server client and authenticated-user guard |
| [`lib/supabase/public.ts`](lib/supabase/public.ts) | Stateless anonymous client used by the healthcheck |
| [`lib/supabase/proxy.ts`](lib/supabase/proxy.ts) | Session-cookie refresh, protected-route redirects, and authenticated login redirects |

### Supabase infrastructure

| Path | Purpose |
| --- | --- |
| [`supabase/config.toml`](supabase/config.toml) | Local Supabase CLI ports, schemas, Auth URLs, and Storage limits |
| [`supabase/migrations/20260731000000_initial_schema.sql`](supabase/migrations/20260731000000_initial_schema.sql) | Complete schema, enum, constraints, triggers, indexes, scoring/leaderboard RPCs, RLS, column grants, buckets, and Storage policies |
| [`supabase/seed.sql`](supabase/seed.sql) | Intentionally empty seed entry point; profiles are generated from Auth users |

### Public assets

| Path | Purpose |
| --- | --- |
| [`public/sw.js`](public/sw.js) | Production service worker with static caching, cache-version cleanup, and navigation fallback |

## Database model

### `perfiles`

Extends `auth.users` with a display name and avatar URL. The primary key is the
Auth user UUID. A trigger creates the row automatically after registration.

### `tablas`

Stores the table name, creator, scoring system, maximum score, custom drawing
URL, creation time, and immutable closing state.

### `tabla_filas`

Stores the table relationship, participant UUID array, notes, editable EC
points, WtA/Pod position, and final points assigned at closing.

## Security model

The UI validates values for immediate feedback, but PostgreSQL remains the
security boundary:

- Only authenticated users can read application data.
- Only a table creator can mutate that table while it is open.
- RLS prevents edits and deletion after closing.
- Column grants prevent clients from writing final points or closing fields.
- The `close_table` function verifies ownership and scoring validity while
  holding a database lock.
- Storage writes are restricted to a folder named after the authenticated
  user's UUID.
- Files are checked again in Server Actions before upload.
- Redirect targets are restricted to same-origin paths.
- The service worker does not persist private application responses.
- No service-role key is required by the application.

See [`SECURITY.md`](SECURITY.md) for credential and vulnerability-reporting
guidance.

## Healthcheck

`GET /api/health` calls a minimal PostgreSQL function. In production it requires:

```http
Authorization: Bearer <HEALTHCHECK_SECRET>
```

A low-traffic development deployment can schedule this request every four or
five days with Cron-Job.org or another monitor. Send the secret in the
`Authorization` header, never in the URL.

## Deployment

1. Import the repository into Vercel.
2. Configure all variables from `.env.example` for Preview and Production.
3. Add Preview and Production callback URLs to Supabase Auth.
4. Use `dev` as the Preview branch and `main` as the Production branch.
5. Protect `main` in GitHub by requiring a pull request and the `quality` check.
6. Configure GitHub OAuth separately for every callback domain if that provider
   is enabled.

Use separate Supabase projects for Preview and Production when strict data
isolation is required.
