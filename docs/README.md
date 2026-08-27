# Digimenu

Digimenu replaces static PDF menus with fast, photo-led web menus that restaurant teams can update without a redesign.

Public menus are tenant-scoped by slug: `/restaurant-1` and `/restaurant-2` are separate menu pages backed by `/api/menu/:slug`.

The web UI uses TanStack Start for SSR and file-based routes. Hono remains a separate API Worker under `/api/*`, with D1, R2, and Better Auth bindings in `wrangler.api.toml`.

## Local setup

1. Install dependencies with `npm install`.
2. Start the Worker with `npm run dev:worker` and the UI with `npm run dev` in separate terminals. The Start dev server stays on `5173` and proxies `/api` requests to the Hono Worker on `8787`.
3. Open `/` for the public Salt & Ember demo and `/admin` for the admin preview.
4. Run `npm run typecheck`, `npm test`, and `npm run build` before deploying.

The first UI slice intentionally uses local fixture data so it is useful before Cloudflare resources exist: the public demo menu renders from `src/data.ts` when the API is unreachable. The admin workspace requires the API worker and shows real error states without it.

UI styling uses Tailwind CSS v4 through `@tailwindcss/vite`. Shared controls live in `src/components/ui` as shadcn-style primitives, with `cn()` and class variance utilities for variants. Screens are organized by feature under `src/features/` (`auth/`, `public/`, `workspace/`); `src/App.tsx` is a thin barrel re-exporting them for the route files.

For local Worker development, copy `.dev.vars.example` to `.dev.vars`, add a secret, and use `npm run dev`. This starts the TanStack Start UI and the Hono API Worker together.

## Features

### Public menu

The public route is mobile-first and designed to be shared as a simple restaurant URL. The bento grid gives the first item a larger visual tile, while category pills and search keep a photo-heavy menu easy to scan. Dish images are currently Unsplash fixtures; production image URLs should be generated from the R2 object key.

### Admin workspace

`/admin` contains the authenticated-workspace shape: restaurant switcher, menu items, publish state, preview link, settings, and add-item modal. The current screen uses a demo session; all write endpoints require a server-side session before production use.

### Authentication

Better Auth is mounted at `/api/auth/*` and uses D1 directly. Email/password auth is enabled in `server/auth.ts`. Admin writes call `auth.api.getSession()` and derive the restaurant from the authenticated user, never from a browser-provided restaurant ID. Apply the migration before testing auth and set `BETTER_AUTH_SECRET` with `npx wrangler secret put BETTER_AUTH_SECRET`.

### D1 and R2

`server/db/migrations/0001_initial.sql` stores restaurants and ordered menu items. `POST /api/admin/images` writes an uploaded image to R2 and returns the object key. Store the key on the menu item, not the full file or a temporary URL. Configure API bindings in `wrangler.api.toml`.

## Cloudflare deployment

1. Create a D1 database and R2 bucket, then replace the placeholders in `wrangler.api.toml`.
2. Apply schema with `npx wrangler d1 migrations apply digimenu-production --config wrangler.api.toml --remote`.
3. Add the auth secret with `npx wrangler secret put BETTER_AUTH_SECRET`.
4. Update `PUBLIC_APP_URL` to the deployed origin.
5. Build and deploy the SSR web Worker with `npm run deploy:web`.
6. Deploy the Hono API Worker with `npm run deploy:api`.

The TanStack Start Worker serves the SSR web app. The Hono API Worker owns D1, R2, and Better Auth. Route `/api/*` from the web origin to the API Worker through a Cloudflare route, custom domain, or service binding.

Public image serving is gated: `/api/images/*` returns an object only when a published menu item from a published restaurant references it. Draft photos are previewed through the authenticated `/api/admin/images/*` route, scoped to the owner's tenant prefix. Sign-in attempts are rate-limited per IP (10/min) and image uploads per restaurant (60/hr) via a D1-backed fixed-window limiter (`server/rate-limit.ts`, migration `0007_rate_limits.sql`) that fails open on database errors. Uploads are validated by magic bytes rather than declared MIME type.

## Verification

`npm test` covers the menu validation contract, security primitives (`server/images.ts`, `server/rate-limit.ts`), the client fallback rules (`src/api.ts`), and HTTP-level API behavior via Hono's in-process `app.request()` with stubbed D1/R2 bindings (`tests/api-routes.test.ts`): hardening headers, image gating, sign-in rate limiting, sitemap output, and SSR fallthrough. Auth flows against a real D1 (session cookies, ownership scoping) are still worth exercising against a local Miniflare/Wrangler environment before production.
