# HeVi Tables

HeVi Tables is a private, mobile-first PWA for running predictions, friendly
bets, and competitions. Friends can create custom tables, draw a cover, assign
participants to entries, close the result under a predefined scoring system,
and compare weekly, monthly, or all-time leaderboards.

## Features

- Next.js 16 App Router application written in TypeScript.
- Email/password and Google authentication through Supabase Auth.
- Group-first home screen with private memberships, shareable 10-character
  invite codes, and owner-controlled code rotation.
- Creator-editable table artwork and planned closing dates, kept separate from
  the immutable scoring closure timestamp.
- Optional 280-character table descriptions available during creation and
  later editing.
- Text or numeric entry information. Numeric tables support ascending or
  descending order, and `WtA`/`Pod` positions are derived automatically from
  that quantity both in the live UI and authoritatively at closing.
- Up to three private evidence photos per row, with browser-side crop/zoom,
  WebP compression, a 512×512 maximum, server-side reprocessing, and signed
  group-member URLs.
- Per-user light, dark, or system theme preference plus five selectable accent
  colors.
- Persistent in-app notifications plus per-device system notifications for new
  group members, tables, table rows, and table closure. Realtime covers
  connected clients; standards-based Web Push covers subscribed browsers and
  installed webapps after they close.
- Accessible custom listboxes replace native operating-system selects while
  following the active theme and accent color.
- Touch- and mouse-friendly drawing canvas with pointer-noise filtering,
  automatic multi-pass smoothing, cubic Bézier rendering, four colors, undo,
  clear, and PNG export.
- Three scoring systems:
  - `WtA` — one entry receives all available points.
  - `Pod` — uses `maxPoint - ((position - 1) * 2)`, clamped at zero.
  - `EC` — points are assigned manually between zero and the table maximum.
- Rows can contain multiple participants, stored as PostgreSQL UUID arrays.
- Atomic and irreversible table closing inside PostgreSQL.
- Per-group and per-table leaderboards for the last 7 days, last 30 days, or
  all recorded history. Open-table points are provisional and refresh through
  Realtime as rows are added; closed-table points remain definitive.
- User profiles and avatar uploads.
- PostgreSQL Row Level Security, column-level grants, Storage policies, file
  limits, validation triggers, and performance indexes.
- Installable PWA manifest, generated icons, static asset caching, and an
  offline fallback.
- Context-aware mobile navigation for groups, the current group's tables,
  rankings, and account settings.
- Protected database healthcheck for low-traffic development deployments.
- Automated linting, type checking, tests, dependency auditing, and production
  builds.

## Technology

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Web application | Next.js App Router and React | Server-rendered pages, client interactions, Server Actions, and API routes |
| Language | TypeScript | Domain types, validation, UI, and server code |
| Authentication | Supabase Auth | Email/password sessions and Google OAuth |
| Database | Supabase PostgreSQL | Groups, memberships, tables, rows, scoring, and leaderboard aggregation |
| Realtime | Supabase Realtime | Live delivery of row-level-secured notifications to connected clients |
| Web Push | Push API, service worker, VAPID, and a Supabase Edge Function | Native device notifications, including delivery after the app closes |
| File storage | Supabase Storage | Avatars, table cover drawings, and private evidence photos |
| Validation | Zod and PostgreSQL | Fast UI feedback plus authoritative database checks |
| Testing | Vitest | Scoring rule unit tests |
| Deployment | Vercel | Preview deployments from `dev` and production from `main` |
| Continuous integration | GitHub Actions | Quality checks on pushes and pull requests |

## Requirements

- Node.js 20.9 or newer. Node.js 20 is the repository's pinned development
  version.
- npm.
- Docker Engine/Desktop or another Docker-compatible runtime for fully local
  development.
- A hosted Supabase project only when testing against Supabase Cloud.

The repository includes `.nvmrc` and `.node-version`, both set to Node.js 20.
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

3. Apply every migration in [`supabase/migrations`](supabase/migrations) in
   filename order. The CLI does this automatically:

   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   supabase db push
   ```

4. In **Supabase > Authentication > URL Configuration**, add:

   - Site URL: `http://localhost:3000`
   - Redirect URL: `http://localhost:3000/auth/callback`

   Enable the Google provider and configure its OAuth credentials if Google
   login is required. Email/password login works independently.

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open `http://localhost:3000`.

### Google OAuth configuration

Google login needs one external configuration in addition to the application
code:

1. In Google Auth Platform, create an OAuth client with the **Web
   application** type.
2. Add the application origin, for example `http://localhost:3000` during
   development and `https://your-domain.example` in production.
3. Add Supabase's callback as an authorized redirect URI:
   `https://<project-ref>.supabase.co/auth/v1/callback`.
4. In **Supabase > Authentication > Providers > Google**, enable the provider
   and paste the Google client ID and client secret.
5. In **Supabase > Authentication > URL Configuration**, set the production
   Site URL to `https://your-domain.example` and allow
   `https://your-domain.example/auth/callback` as a Redirect URL.

The Google client secret belongs only in the Google/Supabase provider
configuration. It must not be exposed through a `NEXT_PUBLIC_` variable or
committed to this repository. The local Supabase stack also needs its own
Google provider credentials before the local Google button can complete a
login; email/password authentication remains available without them.

### Device notifications and Web Push

Granting notification permission immediately enables system notifications
while the authenticated page or PWA still has a live Realtime connection.
Configuring Web Push additionally lets the browser receive notifications after
the app has been suspended or closed.

1. Generate one VAPID key pair:

   ```bash
   npm run push:keys
   ```

2. Add the public key to the Next.js/Vercel environment:

   ```dotenv
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public-key>
   ```

3. Create a separate long random webhook secret. Store the private VAPID key,
   the same public key, the webhook secret, and a contact URI in Supabase Edge
   Function secrets:

   ```bash
   supabase secrets set \
     VAPID_SUBJECT=mailto:admin@example.com \
     VAPID_PUBLIC_KEY=<public-key> \
     VAPID_PRIVATE_KEY=<private-key> \
     PUSH_WEBHOOK_SECRET=<random-webhook-secret>
   supabase functions deploy send-push --no-verify-jwt
   ```

4. Point the private database dispatcher at the deployed function. Run this in
   Supabase SQL Editor, substituting the same webhook secret:

   ```sql
   insert into private.push_delivery_config (
     singleton,
     webhook_url,
     webhook_secret
   ) values (
     true,
     'https://<project-ref>.supabase.co/functions/v1/send-push',
     '<random-webhook-secret>'
   )
   on conflict (singleton) do update set
     webhook_url = excluded.webhook_url,
     webhook_secret = excluded.webhook_secret,
     updated_at = now();
   ```

The function endpoint deliberately skips JWT verification because PostgreSQL
calls it asynchronously. The function itself rejects every request whose
`x-hevi-webhook-secret` header does not match its secret. VAPID private material
never reaches the browser or repository.

For fully local testing, put the public key in `.env.local`, serve the function
with its four secrets in an untracked env file, and use
`http://host.docker.internal:54321/functions/v1/send-push` as the private
dispatcher URL. `localhost` is a secure context for browser APIs. On iPhone and
iPad, the site must be installed as a Home Screen webapp before it can request
notification permission.

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
| `npm run push:keys` | Generates a VAPID public/private key pair for Web Push |
| `npm run check` | Runs lint, type checking, tests, and the production build |

## How the application works

### Authentication

Supabase stores the session in cookies. `proxy.ts` refreshes those cookies and
protects application routes. The server retrieves the authenticated user before
reading or mutating private data. A profile is created automatically by a
database trigger when an Auth user is registered.

### Table creation

The browser records normalized pointer samples. When a stroke ends, nearby
samples are removed, pointer noise is averaged, redundant points are simplified,
and corners are rounded in multiple passes. The finalized points are rendered
as cubic Bézier curves, so the PNG export contains the processed stroke rather
than the raw pointer path. Every table belongs to one group. The Server Action
validates group membership and the file, uploads it under the authenticated
user's Storage folder, creates the table, and removes the upload again if the
database insert fails.

The creator can later replace the processed cover drawing and change or clear
the planned closing date and description. The text/number format and numeric
sort direction can also be changed until the first row is added. This metadata
update runs through a dedicated PostgreSQL function, so it remains available
after closing without granting any ability to alter final points or the real
`closed_date`.

### Appearance preferences

Each profile stores a `light`, `dark`, or `system` theme preference and one of
five constrained accent-color names. A client controller resolves system dark
mode and applies data attributes to the document. CSS custom properties drive
surfaces, text, focus rings, active controls, and accent states without storing
arbitrary user-provided CSS values.

### Notifications

Database triggers create one notification per affected group member, excluding
the actor, when a member joins, a table or row is created, or a table closes.
Recipients can only select and mark their own notifications as read. The header
menu loads recent history and subscribes to new rows through a filtered Realtime
channel. Each browser can independently request system-notification permission.
Its Push subscription is stored under the authenticated user, and an
asynchronous PostgreSQL webhook calls `send-push`, which signs and delivers the
payload with VAPID. Expired browser endpoints are removed automatically.

### Groups and invite codes

The authenticated home page lists the user's groups rather than mixing every
table together. A user can create a group or join one by entering its
case-insensitive 10-character code. Group creation and joining are atomic
PostgreSQL functions. Members can copy the current code, while only the group
owner can rotate it and invalidate the previous code.

### Rows and participants

Only the creator of an open table can add, update, or delete rows. Each row
stores one or more profile IDs in `user_ids`, and every selected profile must be
a member of the table's group. The database rejects empty arrays, duplicate
IDs, nonexistent or out-of-group profiles, values incompatible with the
selected scoring system, and all edits after closing.

Each table fixes the row information format to either text or number. A numeric
`WtA` or `Pod` table is displayed in configured ascending/descending order
immediately; `close_table` repeats that ranking inside the transaction so the
score never depends on client ordering. A row may reference at most three
private evidence objects. The cropper exports WebP within 512×512 and the Server
Action reprocesses the image before Storage accepts it.

### Closing and scoring

The `close_table` PostgreSQL function is the authoritative scoring engine. It
locks the table, checks ownership and rule validity, calculates every
`points_won` value, and marks the table as closed in one transaction. Clients
cannot directly write `points_won`, `closed`, or `closed_date`.

### Leaderboards

`get_group_leaderboard` expands each row's UUID array, joins it to profiles,
restricts both members and tables to one group, filters by date and optional
table ID, and returns accumulated points and the number of scored tables per
user. Open rows are scored provisionally from their current EC value or
WtA/Pod position; closed rows use immutable `points_won` values.

### PWA and offline behavior

The manifest and icons are generated by Next.js. The service worker handles
background Push and notification clicks. Outside local development it also
caches only versioned static assets, icons, and the offline page; it deliberately
does not cache authenticated HTML, API responses, or leaderboard data.

## Repository map

### Root configuration and documentation

| Path | Purpose |
| --- | --- |
| [`README.md`](README.md) | Project overview, setup, architecture, deployment, and repository reference |
| [`SECURITY.md`](SECURITY.md) | Vulnerability reporting and secret-handling rules |
| [`LICENSE.md`](LICENSE.md) | Repository license terms |
| [`.env.example`](.env.example) | Safe template for the required runtime variables; contains no real credentials |
| [`.gitignore`](.gitignore) | Excludes dependencies, builds, local environment files, caches, and provider state |
| [`.nvmrc`](.nvmrc) | Selects Node.js 20 for nvm |
| [`.node-version`](.node-version) | Selects Node.js 20 for version managers such as asdf or mise |
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
| [`app/(app)/page.tsx`](app/(app)/page.tsx) | Group-first home with the user's group cards plus create/join-by-code forms |
| [`app/(app)/grupos/[id]/page.tsx`](app/(app)/grupos/[id]/page.tsx) | Group workspace with invite code, members, scoped leaderboard, and tables |
| [`app/(app)/grupos/[id]/tablas/nueva/page.tsx`](app/(app)/grupos/[id]/tablas/nueva/page.tsx) | Group-scoped table creation page |
| [`app/(app)/grupos/[id]/tablas/[tableId]/page.tsx`](app/(app)/grupos/[id]/tablas/[tableId]/page.tsx) | Group-scoped table detail and editing page |
| [`app/(app)/perfil/page.tsx`](app/(app)/perfil/page.tsx) | Profile and avatar management page |
| [`app/(app)/tablas/nueva/page.tsx`](app/(app)/tablas/nueva/page.tsx) | Legacy new-table URL redirected to the group-first home |
| [`app/(app)/tablas/[id]/page.tsx`](app/(app)/tablas/[id]/page.tsx) | Legacy table URL redirected to its group-scoped route |
| [`app/login/page.tsx`](app/login/page.tsx) | Public sign-in and registration page |
| [`app/offline/page.tsx`](app/offline/page.tsx) | Offline fallback displayed when navigation cannot reach the server |
| [`app/not-found.tsx`](app/not-found.tsx) | Application-wide not-found state |

The `(app)` directory is a route group. Its name organizes protected pages but
does not appear in their public URLs.

### Server Actions

| Path | Purpose |
| --- | --- |
| [`app/actions/auth.ts`](app/actions/auth.ts) | Server-side sign-out and redirect |
| [`app/actions/groups.ts`](app/actions/groups.ts) | Group creation, code-based joining, invite-code rotation, validation, and redirects |
| [`app/actions/notifications.ts`](app/actions/notifications.ts) | Marks the authenticated user's unread notifications as read |
| [`app/actions/push.ts`](app/actions/push.ts) | Validates and stores or removes the authenticated browser's Push subscription |
| [`app/actions/preferences.ts`](app/actions/preferences.ts) | Validates and persists the authenticated user's theme and accent color |
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
| [`components/app-shell.tsx`](components/app-shell.tsx) | Desktop header, profile summary, sign-out control, and mobile-navigation host |
| [`components/appearance-settings.tsx`](components/appearance-settings.tsx) | Theme and constrained accent-color controls with immediate preview |
| [`components/auth-form.tsx`](components/auth-form.tsx) | Client-side email login, registration, Google OAuth, and auth feedback |
| [`components/avatar.tsx`](components/avatar.tsx) | Avatar image with an initials fallback |
| [`components/configuration-needed.tsx`](components/configuration-needed.tsx) | Safe setup screen shown when public Supabase variables are missing |
| [`components/create-table-form.tsx`](components/create-table-form.tsx) | Coordinates table settings, canvas export, file creation, submission, and errors |
| [`components/drawing-canvas.tsx`](components/drawing-canvas.tsx) | Pointer input, automatic stroke finalization, cubic Bézier rendering, palette, undo, clear, resize, and PNG export |
| [`components/evidence-picker.tsx`](components/evidence-picker.tsx) | Three-image evidence picker with resizing, WebP compression, crop/zoom controls, previews, and removal |
| [`components/group-card.tsx`](components/group-card.tsx) | Group summary card with role, member count, and table status |
| [`components/group-forms.tsx`](components/group-forms.tsx) | Client forms for creating a group or joining with an invite code |
| [`components/invite-code.tsx`](components/invite-code.tsx) | Copyable group code and owner-only code rotation control |
| [`components/leaderboard.tsx`](components/leaderboard.tsx) | Ranked user list, medals, scores, avatars, and empty state |
| [`components/mobile-navigation.tsx`](components/mobile-navigation.tsx) | Context-aware mobile links to groups, current-group tables, ranking, and settings |
| [`components/notification-menu.tsx`](components/notification-menu.tsx) | Notification bell, unread count, recent activity panel, and Realtime subscription |
| [`components/device-notification-settings.tsx`](components/device-notification-settings.tsx) | Per-device permission, Push subscription, test notification, status, and unsubscribe controls |
| [`components/profile-form.tsx`](components/profile-form.tsx) | Profile name and avatar upload form backed by a Server Action |
| [`components/ranking-realtime-refresh.tsx`](components/ranking-realtime-refresh.tsx) | Refreshes the current group ranking when Realtime reports a newly inserted table row |
| [`components/row-editor.tsx`](components/row-editor.tsx) | Editable/read-only row views, participant selection, conditional rule inputs, deletion, and table closing |
| [`components/select-field.tsx`](components/select-field.tsx) | Accessible themed combobox/listbox used everywhere instead of native selects |
| [`components/service-worker-register.tsx`](components/service-worker-register.tsx) | Registers the service worker in browsers that support it |
| [`components/table-card.tsx`](components/table-card.tsx) | Reusable table preview with cover, state, scoring system, and dates |
| [`components/table-settings-form.tsx`](components/table-settings-form.tsx) | Creator form for replacing a table drawing and editing its description and planned closing date |
| [`components/theme-controller.tsx`](components/theme-controller.tsx) | Resolves saved/system theme preference and applies document appearance attributes |

### Domain and utility modules

| Path | Purpose |
| --- | --- |
| [`lib/types.ts`](lib/types.ts) | Domain models, action result types, scoring enum, and typed Supabase database contract |
| [`lib/validation.ts`](lib/validation.ts) | Zod schemas for tables, rows, profiles, and credentials |
| [`lib/rules.ts`](lib/rules.ts) | Pure TypeScript implementation of WtA, Pod, and EC calculations for testable rule behavior |
| [`lib/rules.test.ts`](lib/rules.test.ts) | Tests successful calculations, clamping, validation failures, and input immutability |
| [`lib/format.ts`](lib/format.ts) | Spanish locale date/point formatting, initials, and scoring-system labels |
| [`lib/device-notifications.ts`](lib/device-notifications.ts) | Shared service-worker registration, notification URL, VAPID conversion, and connected-client system notification helpers |
| [`lib/drawing.ts`](lib/drawing.ts) | Pure point filtering, pointer-noise reduction, simplification, and corner-rounding pipeline |
| [`lib/drawing.test.ts`](lib/drawing.test.ts) | Tests smoothing, endpoint preservation, jitter reduction, and input immutability |

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
| [`supabase/migrations/20260731000000_initial_schema.sql`](supabase/migrations/20260731000000_initial_schema.sql) | Core profile, table, row, scoring, RLS, grants, and Storage schema |
| [`supabase/migrations/20260731010000_groups.sql`](supabase/migrations/20260731010000_groups.sql) | Groups, memberships, invite RPCs, scoped leaderboard, data migration, and group-aware RLS |
| [`supabase/migrations/20260731020000_backfill_group_participants.sql`](supabase/migrations/20260731020000_backfill_group_participants.sql) | Preserves existing participants by adding them to each migrated table's group |
| [`supabase/migrations/20260731030000_table_settings.sql`](supabase/migrations/20260731030000_table_settings.sql) | Planned closing date and narrowly scoped table-artwork/settings update RPC |
| [`supabase/migrations/20260731040000_preferences_notifications_descriptions.sql`](supabase/migrations/20260731040000_preferences_notifications_descriptions.sql) | Appearance preferences, table descriptions, notification triggers, RLS, indexes, and Realtime publication |
| [`supabase/migrations/20260731050000_entry_formats_evidence_push.sql`](supabase/migrations/20260731050000_entry_formats_evidence_push.sql) | Typed row information, automatic numeric ranking, private evidence Storage, Push subscriptions, and asynchronous delivery trigger |
| [`supabase/migrations/20260731060000_live_leaderboard.sql`](supabase/migrations/20260731060000_live_leaderboard.sql) | Provisional open-table leaderboard scoring and Realtime publication for new rows |
| [`supabase/functions/send-push/index.ts`](supabase/functions/send-push/index.ts) | Secret-checked database-webhook receiver that sends VAPID Web Push and removes expired endpoints |
| [`supabase/functions/send-push/deno.json`](supabase/functions/send-push/deno.json) | Isolated strict Deno configuration for the Push function |
| [`supabase/seed.sql`](supabase/seed.sql) | Intentionally empty seed entry point; profiles are generated from Auth users |

### Public assets

| Path | Purpose |
| --- | --- |
| [`public/sw.js`](public/sw.js) | Service worker for Web Push display/click handling, static caching, cache cleanup, and offline navigation fallback |

## Database model

### `perfiles`

Extends `auth.users` with a display name and avatar URL. The primary key is the
Auth user UUID. A trigger creates the row automatically after registration.

### `tablas`

Stores the table name, creator, scoring system, maximum score, custom drawing
URL, text/number information format, numeric sort direction, optional planned
closing date, group relationship, creation time, and immutable real closing
state. It can also contain a short optional description.

### `grupos`

Stores each private group's name, owner, current unique invite code, and
timestamps. Existing data is migrated into an initial group owned by the table
creator.

### `grupo_miembros`

Connects profiles to groups with an `owner` or `member` role. Its composite key
prevents duplicate memberships.

### `notificaciones`

Stores recipient-scoped activity events with optional group, table, and actor
relationships plus read and creation timestamps. RLS exposes each row only to
its recipient.

### `push_subscriptions`

Stores one standards-based Push endpoint and encryption-key pair per subscribed
browser. RLS lets users manage only their own devices; the Edge Function reads
subscriptions with server-only credentials.

### `tabla_filas`

Stores the table relationship, participant UUID array, text or numeric value,
up to three private evidence paths, editable EC points, WtA/Pod position, and
final points assigned at closing.

## Security model

The UI validates values for immediate feedback, but PostgreSQL remains the
security boundary:

- Authenticated users can only read groups they belong to, tables and rows from
  those groups, and profiles with whom they share a group.
- Group creation and code-based joining run through narrowly granted database
  functions; only an owner can rotate a group's code.
- Table artwork and the planned date are updated through a creator-only
  function that cannot modify rows, scoring rules, final points, or the real
  closure timestamp.
- Notification inserts are owned by database triggers; clients can only read
  their own rows and update the `read_at` column.
- Push subscriptions are owner-scoped by RLS. The delivery function accepts
  only the database's shared webhook secret, and VAPID private keys stay in
  Edge Function secrets.
- Theme and accent values are constrained to known names, so preferences cannot
  inject arbitrary styles.
- Only a table creator can mutate that table while it is open.
- RLS prevents edits and deletion after closing.
- Column grants prevent clients from writing final points or closing fields.
- The `close_table` function verifies ownership and scoring validity while
  holding a database lock.
- Storage writes are restricted to a folder named after the authenticated
  user's UUID. Evidence reads additionally require membership in the table's
  group and use expiring signed URLs.
- Files are checked again in Server Actions before upload; evidence is decoded,
  resized, converted to WebP, and constrained by database count checks.
- Redirect targets are restricted to same-origin paths.
- The service worker does not persist private application responses.
- No service-role key reaches the Next.js application or browser. Supabase
  exposes one only inside the optional Push Edge Function.

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
6. Configure Google OAuth separately for every callback domain if that provider
   is enabled.
7. Configure and deploy Web Push as described above if notifications must arrive
   after browsers or installed webapps close.

Use separate Supabase projects for Preview and Production when strict data
isolation is required.
