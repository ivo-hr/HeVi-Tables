# HeVi Tables

HeVi Tables is a private, mobile-first PWA for running predictions, friendly
bets, and competitions. Friends can create custom tables, draw or upload a
cover, assign participants to entries, close the result under a predefined
scoring system, and compare weekly, monthly, or all-time leaderboards.

## Features

- Next.js 16 App Router application written in TypeScript.
- Email/password and Google authentication through Supabase Auth.
- Group-first home screen with private memberships, shareable 10-character
  invite codes, owner-controlled code rotation, editable one-to-three-symbol marks,
  and stable low-contrast group colors.
- In-place table discovery behind a compact search control, with combinable
  name, creator, open/closed-state, and calendar-period filters plus ordering
  by creation date, name, creator, or state.
- Creator-editable drawn or photographic table artwork and planned closing
  dates, kept separate from the immutable scoring closure timestamp.
- Optional 280-character table descriptions available during creation and
  later editing.
- Text or numeric entry information. Numeric tables support ascending or
  descending order, and `WtA`/`Pod` positions are derived automatically from
  that quantity both in the live UI and authoritatively at closing.
- One visual crop editor shared by avatars, table photos, and up to three
  private evidence photos per row. It keeps the complete source visible behind
  a directly movable and corner-resizable 1:1 crop frame, emits WebP at no more
  than 512×512 and 1 MiB, supports repeated 90-degree rotation, and is backed
  by authoritative server-side reprocessing.
- Compact evidence thumbnails appear directly on each row. Opening a row shows
  a read-first participant/value/evidence detail view with an in-app full-size
  lightbox; editing only starts from its explicit edit button.
- Per-user light, dark, or system theme preference plus five selectable accent
  colors.
- Complete Spanish and English interface copy, locale-aware dates and numbers,
  and a language preference persisted both with the account and in the current
  browser.
- A bilingual legal/privacy/terms disclosure at the end of Settings and on a
  public pre-registration page, with deployment-configurable operator details.
- Persistent in-app notifications plus per-device system notifications for new
  group members, tables, table rows, and table closure. Realtime covers
  connected clients; standards-based Web Push covers subscribed browsers and
  installed webapps after they close.
- Accessible custom listboxes replace native operating-system selects while
  following the active theme and accent color.
- Touch- and mouse-friendly drawing canvas with pointer-noise filtering,
  automatic multi-pass smoothing, cubic Bézier rendering, four colors, undo,
  clear, a square canvas, and 512 px-capped PNG export before server
  normalization.
- Three scoring systems:
  - `WtA` — one entry receives all available points.
  - `Pod` — uses `maxPoint - ((position - 1) * 2)`, clamped at zero.
  - `EC` — points are assigned manually between zero and the table maximum.
- Rows can contain multiple participants, stored as PostgreSQL UUID arrays.
- Atomic and irreversible table closing inside PostgreSQL.
- Per-group and per-table leaderboards for a selectable Monday-based calendar
  week, calendar month, or all recorded history. The current month is the
  default; the three main periods remain visible, while the concrete date and
  table controls stay behind a compact search button. Open-table points are provisional and update in place through
  Realtime on row creation, editing, or deletion; closed-table points remain
  definitive. Expandable member analysis includes participation, first-place
  finishes, averages, best results, confirmed points, and points still in play.
- User profiles and avatar uploads.
- PostgreSQL Row Level Security, column-level grants, Storage policies, file
  limits, validation triggers, and performance indexes.
- Installable PWA manifest, mascot-based icons and favicon, static asset caching, and an
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
| Realtime | Supabase Realtime | Live delivery of notifications and ranking changes to connected clients |
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
   NEXT_PUBLIC_LEGAL_CREATOR=<creator-or-operator-name>
   NEXT_PUBLIC_LEGAL_CONTACT=<private-contact-email-or-url>
   NEXT_PUBLIC_LEGAL_REPOSITORY=https://github.com/ivo-hr/HeVi-Tables
   ```

   The PostgreSQL password is not a frontend variable. Do not add it to
   `.env.local`, source files, commits, issues, or logs.

   Before a public launch, replace the sample legal contact with a private,
   monitored channel and identify the real operator. Where the concrete
   activity requires an address or registration/tax disclosure, also set
   `NEXT_PUBLIC_LEGAL_ADDRESS` and `NEXT_PUBLIC_LEGAL_REGISTRATION`. The
   repository provides the disclosure structure, but the deployer remains
   responsible for making those factual details accurate for the actual
   service and jurisdiction.

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

### Language and legal information

The root layout reads the `hevi_locale` cookie before rendering, so public and
authenticated server output use the same language without client-only text
swaps. Each profile also stores `es` or `en`; login synchronizes that saved
choice to the browser, while Settings updates both. Validation, Server Action
feedback, dates, number formatting, metadata, the PWA manifest, notification
copy, and empty/error states use the active locale.

Settings ends with expandable copyright, operator, privacy, necessary-storage,
terms, and disclaimer sections. The same disclosure is available at `/legal`
before registration and is linked from the login form. Its creator, contact,
repository, optional address, and optional registration details come from the
public legal environment variables, so production deployments do not need to
fork UI copy just to insert truthful operator data.

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
owner can rotate it and invalidate the previous code. Each group also stores an
owner-editable mark of up to three letters, numbers, symbols, or emoji; its UUID selects one stable soft color so
the same identity is rendered consistently for every member.

### Rows and participants

Any member of an open table's group can add, update, or delete rows. Each row
stores one or more profile IDs in `user_ids`, and every selected profile must be
a member of the table's group. The database rejects empty arrays, duplicate
IDs, nonexistent or out-of-group profiles, values incompatible with the
selected scoring system, and all edits after closing.

Each table fixes the row information format to either text or number. A numeric
`WtA` or `Pod` table is displayed in configured ascending/descending order
immediately; `close_table` repeats that ranking inside the transaction so the
score never depends on client ordering. A row may reference at most three
private evidence objects. The cropper exports square WebP within 512×512 and
the Server Action enforces the square crop again before Storage accepts it. Storage paths are
checked against group membership without ambiguously resolving the table's
display name as the object path.

### Closing and scoring

The `close_table` PostgreSQL function is the authoritative scoring engine. It
locks the table, checks ownership and rule validity, calculates every
`points_won` value, and marks the table as closed in one transaction. Clients
cannot directly write `points_won`, `closed`, or `closed_date`.

### Leaderboards

`get_group_leaderboard` expands each row's UUID array, joins it to profiles,
restricts both members and tables to one group, filters by date and optional
table ID, and returns accumulated, confirmed, and provisional points together
with participation, first-place finishes, average points, best result, and
latest activity. Open rows are scored provisionally from their current EC
value or WtA/Pod position; closed rows use immutable `points_won` values. A
client provider listens to Realtime and requests only this RPC when ranking
data changes, without refreshing the page.

The `week` period begins at Monday 00:00 and the `month` period at day 1
00:00, using the `Europe/Madrid` calendar and ending at the next matching
boundary. The UI defaults to the current month and lets the user choose an
earlier week or month; these periods are deliberately not rolling 7-day or
30-day windows.

### PWA and offline behavior

The manifest is generated by Next.js and references the optimized mascot icon
set. The service worker handles
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
| [`app/layout.tsx`](app/layout.tsx) | Locale-aware root HTML layout and metadata, language context, viewport settings, CSS, and service-worker registration |
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
| [`app/legal/page.tsx`](app/legal/page.tsx) | Public bilingual privacy, legal notice, cookies, terms, and authorship page |
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
| [`app/actions/preferences.ts`](app/actions/preferences.ts) | Validates and persists theme, accent color, and account/browser language preferences |
| [`app/actions/profile.ts`](app/actions/profile.ts) | Profile validation, bounded WebP avatar processing/upload, old-object cleanup, and profile update |
| [`app/actions/tables.ts`](app/actions/tables.ts) | Table creation, normalized cover/evidence upload, row CRUD, authorization checks, and atomic close RPC invocation |

### Route handlers and generated PWA assets

| Path | Purpose |
| --- | --- |
| [`app/auth/callback/route.ts`](app/auth/callback/route.ts) | Exchanges Supabase PKCE/OAuth codes for cookie-backed sessions and performs safe redirects |
| [`app/api/health/route.ts`](app/api/health/route.ts) | Protected healthcheck that verifies PostgreSQL availability without exposing data |
| [`app/manifest.ts`](app/manifest.ts) | Generates `manifest.webmanifest` for PWA installation |
| [`app/icon.png`](app/icon.png) | Circular close-up of the mascot's face used by browser icon metadata |
| [`app/apple-icon.png`](app/apple-icon.png) | Padded Apple touch icon derived from the supplied mascot logo |
| [`app/favicon.ico`](app/favicon.ico) | Circular 16/32/48 px favicon zoomed into the mascot's wink and smile |

### Reusable UI components

| Path | Purpose |
| --- | --- |
| [`components/app-shell.tsx`](components/app-shell.tsx) | Desktop header, profile summary, sign-out control, and mobile-navigation host |
| [`components/appearance-settings.tsx`](components/appearance-settings.tsx) | Theme and constrained accent-color controls with immediate preview |
| [`components/auth-form.tsx`](components/auth-form.tsx) | Client-side email login, registration, Google OAuth, and auth feedback |
| [`components/avatar.tsx`](components/avatar.tsx) | Avatar image with an initials fallback |
| [`components/configuration-needed.tsx`](components/configuration-needed.tsx) | Safe setup screen shown when public Supabase variables are missing |
| [`components/create-table-form.tsx`](components/create-table-form.tsx) | Coordinates table settings, drawing/photo cover export, submission, and errors |
| [`components/drawing-canvas.tsx`](components/drawing-canvas.tsx) | Pointer input, automatic stroke finalization, cubic Bézier rendering, palette, undo, clear, resize, and PNG export |
| [`components/evidence-picker.tsx`](components/evidence-picker.tsx) | Three-image evidence picker with shared visual cropping, bounded WebP output, previews, retention, and removal |
| [`components/image-crop-editor.tsx`](components/image-crop-editor.tsx) | Full-source crop view, directly movable and corner-resizable 1:1 frame, 90-degree rotation, rule-of-thirds guide, and bounded browser encoding |
| [`components/image-upload-field.tsx`](components/image-upload-field.tsx) | Reusable single-image chooser, preview, edit, replacement, validation, and crop-editor integration |
| [`components/group-card.tsx`](components/group-card.tsx) | Full-color group identity card with its stable tone, up-to-three-symbol mark, role, member count, and table status |
| [`components/group-forms.tsx`](components/group-forms.tsx) | Client forms for creating a named/marked group or joining with an invite code |
| [`components/group-identity-settings.tsx`](components/group-identity-settings.tsx) | Owner control for updating a group's letter/number/symbol/emoji mark without reloading the page |
| [`components/invite-code.tsx`](components/invite-code.tsx) | Copyable group code and owner-only code rotation control |
| [`components/language-provider.tsx`](components/language-provider.tsx) | Client locale context plus bilingual copy and locale-aware date/number helpers |
| [`components/language-settings.tsx`](components/language-settings.tsx) | Account language selector with immediate server-rendered refresh |
| [`components/leaderboard.tsx`](components/leaderboard.tsx) | Expandable ranked-user analysis, aggregate insights, tie-aware positions, scores, avatars, and empty state |
| [`components/legal-disclosure.tsx`](components/legal-disclosure.tsx) | Reusable bilingual copyright, privacy, storage, terms, and disclaimer disclosure |
| [`components/live-ranking.tsx`](components/live-ranking.tsx) | Client ranking provider, visible week/month/history tabs, collapsible calendar/table filters, in-place Realtime refresh, live status, and personal score |
| [`components/mobile-navigation.tsx`](components/mobile-navigation.tsx) | Context-aware mobile links to groups, current-group tables, ranking, and settings |
| [`components/notification-menu.tsx`](components/notification-menu.tsx) | Notification bell, unread count, recent activity panel, and Realtime subscription |
| [`components/device-notification-settings.tsx`](components/device-notification-settings.tsx) | Per-device permission, Push subscription, test notification, status, and unsubscribe controls |
| [`components/profile-form.tsx`](components/profile-form.tsx) | Profile name and avatar upload form backed by a Server Action |
| [`components/row-editor.tsx`](components/row-editor.tsx) | Compact row evidence, read-first record details, participant/value presentation, full-size evidence lightbox, explicit editing, deletion, and table closing |
| [`components/select-field.tsx`](components/select-field.tsx) | Accessible themed combobox/listbox used everywhere instead of native selects |
| [`components/service-worker-register.tsx`](components/service-worker-register.tsx) | Registers the service worker in browsers that support it |
| [`components/table-card.tsx`](components/table-card.tsx) | Reusable table preview with cover, state, creator, scoring system, and dates |
| [`components/table-explorer.tsx`](components/table-explorer.tsx) | Collapsible client-side table search, combined creator/state/calendar filters, multi-field sorting, result count, and empty state |
| [`components/table-cover-editor.tsx`](components/table-cover-editor.tsx) | Switches table artwork between the smoothed drawing canvas and a cropped photo upload |
| [`components/table-settings-form.tsx`](components/table-settings-form.tsx) | Creator form for replacing a table drawing and editing its description and planned closing date |
| [`components/theme-controller.tsx`](components/theme-controller.tsx) | Resolves saved/system theme preference and applies document appearance attributes |

### Domain and utility modules

| Path | Purpose |
| --- | --- |
| [`lib/types.ts`](lib/types.ts) | Domain models, action result types, scoring enum, and typed Supabase database contract |
| [`lib/calendar-periods.ts`](lib/calendar-periods.ts) | Monday-based week/month normalization, locale-aware labels, and historical ranking-period options |
| [`lib/calendar-periods.test.ts`](lib/calendar-periods.test.ts) | Tests current-period defaults, deep-link normalization, labels, and historical option coverage |
| [`lib/validation.ts`](lib/validation.ts) | Zod schemas for tables, rows, profiles, and credentials |
| [`lib/rules.ts`](lib/rules.ts) | Pure TypeScript implementation of WtA, Pod, and EC calculations for testable rule behavior |
| [`lib/rules.test.ts`](lib/rules.test.ts) | Tests successful calculations, clamping, validation failures, and input immutability |
| [`lib/format.ts`](lib/format.ts) | Locale-aware date/point formatting, initials, and scoring-system labels |
| [`lib/i18n.ts`](lib/i18n.ts) | Shared Spanish/English locale types, selection, and number/date formatting primitives |
| [`lib/i18n-server.ts`](lib/i18n-server.ts) | Cookie-backed server locale lookup and bilingual translator |
| [`lib/legal.ts`](lib/legal.ts) | Deployment-configurable creator, operator contact, repository, and legal revision values |
| [`lib/device-notifications.ts`](lib/device-notifications.ts) | Shared service-worker registration, notification URL, VAPID conversion, and connected-client system notification helpers |
| [`lib/drawing.ts`](lib/drawing.ts) | Pure point filtering, pointer-noise reduction, simplification, and corner-rounding pipeline |
| [`lib/drawing.test.ts`](lib/drawing.test.ts) | Tests smoothing, endpoint preservation, jitter reduction, and input immutability |
| [`lib/image-constraints.ts`](lib/image-constraints.ts) | Shared image dimensions, byte limits, accepted MIME types, and UI copy |
| [`lib/image-processing.ts`](lib/image-processing.ts) | Authoritative Sharp rotation, resize, iterative WebP compression, and output validation |
| [`lib/image-processing.test.ts`](lib/image-processing.test.ts) | Tests server-side format normalization, dimension/size ceilings, and invalid MIME rejection |
| [`lib/group-mark.ts`](lib/group-mark.ts) | Unicode-grapheme counting, normalization, and safe three-symbol input truncation for group marks |
| [`lib/group-mark.test.ts`](lib/group-mark.test.ts) | Tests flags, composed emoji, Unicode normalization, and complete-symbol truncation |
| [`lib/presentation.ts`](lib/presentation.ts) | Stable visual tone selection plus reusable varied interface copy |
| [`lib/presentation.test.ts`](lib/presentation.test.ts) | Tests deterministic visual and copy choices |
| [`lib/ranking.ts`](lib/ranking.ts) | Tie-aware ranking-position helpers shared by live and detailed ranking views |
| [`lib/ranking.test.ts`](lib/ranking.test.ts) | Tests tied positions and score tie-breakers |

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
| [`supabase/migrations/20260731070000_evidence_size_limit.sql`](supabase/migrations/20260731070000_evidence_size_limit.sql) | Compatibility increase for evidence objects created before unified processing |
| [`supabase/migrations/20260731080000_member_row_access.sql`](supabase/migrations/20260731080000_member_row_access.sql) | Extends open-row and evidence editing from creators to all group members |
| [`supabase/migrations/20260811000000_unified_image_storage.sql`](supabase/migrations/20260811000000_unified_image_storage.sql) | Aligns avatar, cover, and evidence buckets to private/public visibility, WebP, and 1 MiB uploads |
| [`supabase/migrations/20260811010000_fix_evidence_storage_policy.sql`](supabase/migrations/20260811010000_fix_evidence_storage_policy.sql) | Repairs ambiguous evidence-path RLS evaluation and keeps non-members blocked |
| [`supabase/migrations/20260812000000_notification_copy_variants.sql`](supabase/migrations/20260812000000_notification_copy_variants.sql) | Adds stable five-way copy variants for every notification event |
| [`supabase/migrations/20260812010000_group_identity_ranking_insights.sql`](supabase/migrations/20260812010000_group_identity_ranking_insights.sql) | Adds group marks, richer ranking aggregates, complete ranking Realtime coverage, and the marked-group creation RPC |
| [`supabase/migrations/20260812020000_group_mark_emojis.sql`](supabase/migrations/20260812020000_group_mark_emojis.sql) | Extends group marks to one-to-three Unicode symbols, including composed emoji |
| [`supabase/migrations/20260812030000_calendar_ranking_periods.sql`](supabase/migrations/20260812030000_calendar_ranking_periods.sql) | Replaces rolling 7/30-day ranking windows with Europe/Madrid calendar-week and calendar-month boundaries |
| [`supabase/migrations/20260812040000_selectable_calendar_ranking_periods.sql`](supabase/migrations/20260812040000_selectable_calendar_ranking_periods.sql) | Adds an optional anchor date so any concrete calendar week or month can be queried while retaining the current-period default |
| [`supabase/migrations/20260812050000_profile_locale.sql`](supabase/migrations/20260812050000_profile_locale.sql) | Persists each profile's Spanish/English locale and carries the signup locale into new profiles |
| [`supabase/migrations/20260812060000_localized_notifications.sql`](supabase/migrations/20260812060000_localized_notifications.sql) | Stores durable and background Push notification copy in each recipient's saved language |
| [`supabase/functions/send-push/index.ts`](supabase/functions/send-push/index.ts) | Secret-checked database-webhook receiver that sends VAPID Web Push and removes expired endpoints |
| [`supabase/functions/send-push/deno.json`](supabase/functions/send-push/deno.json) | Isolated strict Deno configuration for the Push function |
| [`supabase/seed.sql`](supabase/seed.sql) | Intentionally empty seed entry point; profiles are generated from Auth users |

### Public assets

| Path | Purpose |
| --- | --- |
| [`public/brand/logo.png`](public/brand/logo.png) | Optimized transparent mascot used by the application header and login screen |
| [`public/icons/`](public/icons/) | Padded 192/512 px install icons plus a maskable safe-zone variant |
| [`public/sw.js`](public/sw.js) | Service worker for Web Push display/click handling, static caching, cache cleanup, and offline navigation fallback |

## Database model

### `perfiles`

Extends `auth.users` with a display name, avatar URL, appearance choices, and
Spanish/English locale. The primary key is the Auth user UUID. A trigger creates
the row automatically after registration.

### `tablas`

Stores the table name, creator, scoring system, maximum score, custom drawing
URL, text/number information format, numeric sort direction, optional planned
closing date, group relationship, creation time, and immutable real closing
state. It can also contain a short optional description.

### `grupos`

Stores each private group's one-to-three-symbol mark, name, owner, current unique
invite code, and timestamps. Existing data is migrated into an initial group
owned by the table creator.

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
8. Replace every sample legal identity/contact value with accurate production
   details and review the disclosure against the service's real hosting,
   retention, analytics, age policy, and jurisdiction before publishing.

Use separate Supabase projects for Preview and Production when strict data
isolation is required.



---
---
---
### TODO

- Order registries by win in wta

- better identity in ux/ui

- release!
