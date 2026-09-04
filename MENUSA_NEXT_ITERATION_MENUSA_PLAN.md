# Menusa Next Iteration Plan

## Context
Menusa is a Vite + TanStack Router (file-based, `src/routes/*`, `src/routeTree.gen.ts`) + Hono on Cloudflare Workers (D1 + R2) + better-auth app. At plan inception, current UX was SPA-tab-state inside `Admin`/`Superadmin` components (`useState<AdminTab>` + `useEffect` pushing `navigate()` when `tab !== initialTab`), so back/forward and refresh reset to `initialTab`. Demo data was Western dishes (`src/data.ts:menuItems`), landing/admin/superadmin/public-menu were English-only, currency was implicit GBP/£, promo was a single `restaurants.promo` JSON blob, and broadcast was fire-and-forget with no history. The ask was 10 features for an Indonesian-first launch: i18n (id default), Indonesian demo data, URL-driven routing with unified `/admin`+`/superadmin`, superadmin user lifecycle + restaurant assignment, user management (username/password/email/restaurants), campaigns & broadcasts history with tags, fuzzy search/filter/sort everywhere, Shopify-like promo & discount engine, banner ↔ promo linkage, and per-restaurant currency (IDR default). Current implementation status is audited below.
## Current state audit

The detailed steps below preserve the original implementation plan. Status labels and this audit are authoritative. `[DONE]` means the feature is present in the current source tree; `[PARTIAL]` means a real slice is shipped but acceptance gaps remain.

| Step | Status | Implemented now | Remaining work |
| --- | --- | --- | --- |
| 1. Routing | DONE | `/admin` is the canonical authenticated workspace with URL-driven child routes, `Link` navigation, browser history, scroll restoration, and role guards | None for the current `/admin` route cutover |
| 2. i18n | PARTIAL | `i18next` resources/detection, Indonesian default, language switcher, and `<html lang>` synchronization | No `I18nextProvider`; many covered-surface strings remain hardcoded; data labels are not translation keys |
| 3. Indonesian demo data | PARTIAL | Indonesian fixture data plus D1 migrations for the demo menu and drinks | DB/fallback categories still use display labels instead of canonical slugs; fallback prices remain strings |
| 4. Superadmin user creation | DONE | Username/membership schema, create-user endpoint, restaurant assignment, UI, uniqueness checks, and validation | None for the planned slice |
| 5. Superadmin user management | DONE | Name/email/username/role/membership editing, separate password reset, delete, and self-protection | None for the planned slice |
| 6. Campaigns and broadcasts | PARTIAL | Campaign persistence, send/history flow, tags/categories, `/campaigns` endpoint, legacy broadcast alias, and history UI | No campaign detail endpoint; query sorting/pagination is not implemented; UI filtering is local |
| 7. Tables and search | PARTIAL | Reusable `DataTable` with fuzzy search, select filters, sorting, and empty states on users/restaurants/campaigns/promos | Menu and waitlist still use bespoke lists; URL sync is implemented but unused; multi-select filters are absent |
| 8. Promo engine | PARTIAL | Promo schema, admin CRUD, status/scope fields, basic editor, and public discounted-price presentation | Discount values/rules are not modeled by the UI; public calculation uses hardcoded percentage/fixed fallbacks; BOGO/bundle behavior is not computed |
| 9. Banner linkage | PARTIAL | Banner schema, admin persistence, promo/announcement rendering, and dismissible public banner | Superadmin settings do not persist banner fields; legacy promo migration and active-promo hydration are incomplete |
| 10. Currency | PARTIAL | Per-restaurant currency schema/defaults, formatting utility, settings UI, persistence, and price rendering | Fixture prices in `src/data.ts` are still strings; runtime currency behavior is complete |

### Status legend

- [x] `[DONE]` — implementation matches the planned slice.
- [~] `[PARTIAL]` — implementation exists; remaining work is listed in the audit table.
- [ ] `[PLANNED]` — no meaningful implementation found.

## Approach

### Step 1 — Fix routing: URL-driven tabs + canonical /admin workspace [DONE]
- **Implemented structure**: `/admin` is the canonical authenticated workspace. `src/routes/admin.tsx` owns the shared `AppShell`; child routes cover menu, menu settings, promos, QR, waitlist, users, restaurants, campaigns, account settings, and restaurant detail/settings.
- **Navigation**: `src/features/app/AppShell.tsx` uses TanStack `Link` and route-aware active state. `src/router.tsx` enables `scrollRestoration: true`, and the old `initialTab` state/prop has been removed.
- **Role gate**: `admin.tsx` checks the session; superadmin-only child routes use `requireSuperadmin`; the sidebar exposes the appropriate workspace for regular users versus superadmins.
- **Compatibility**: `/superadmin` and `/app` remain compatibility redirects to `/admin`; the generated `src/routeTree.gen.ts` includes the canonical routes.
- **Scope note**: This step is done for the chosen `/admin` architecture. Route-specific SSR loaders remain a separate optimization and do not block the current cutover.

### Step 2 — i18n foundation (blocks Steps 3, 6, 8, 9, 10 copy) [PARTIAL]
- Add `i18next` + `react-i18next` + `i18next-browser-languagedetector` (no equivalent exists; `grep` for `i18n|i18next|intl` returns nothing). Create `src/i18n/index.ts` initializing `i18n` with resources `id` (default) and `en`, `fallbackLng: "id"`, `supportedLngs: ["id","en"]`, `interpolation.escapeValue: false`, detection order `localStorage -> navigator -> htmlTag`, cache in `localStorage` key `menusa-lng`.
- Add `src/i18n/locales/id/*.json` and `en/*.json` namespaces: `common`, `landing`, `admin`, `superadmin`, `publicMenu`, `auth`. Seed keys by extracting every user-visible string from `src/features/landing/Landing.tsx`, `src/features/workspace/Admin.tsx`, `src/features/superadmin/Superadmin.tsx`, `src/features/public/PublicMenu.tsx`, `src/features/auth/Login.tsx`, `src/components.tsx`, `src/data.ts` category/tag labels. Keep keys flat `kebab` per file.
- Wrap app in `I18nextProvider` at `src/routes/__root.tsx:RootDocument` (currently `QueryClientProvider` → `ToastProvider`). Add language switcher component `src/components/LanguageSwitcher.tsx` (select `Bahasa Indonesia` / `English`) writing to `i18n.changeLanguage` + `localStorage`. Place it in landing header, admin header dropdown, superadmin header, and public menu footer.
- Set `<html lang={i18n.language}>` dynamically via `useEffect` in `__root.tsx`. Add `localStorage` + `navigator.language` default already handled by detector; ensure first visit without stored pref defaults to `id` even if browser is `en-*` by setting `fallbackLng: "id"` and `load: "languageOnly"` + custom detector that returns `id` when no stored value.
- Replace all hardcoded strings with `t()`; for `src/data.ts` categories/tagSuggestions/dietary labels, export translation keys instead of English literals and resolve in components via `t()`. No runtime translation of DB content (restaurant names, menu item names) — those remain user-authored.
- Verify: `grep` for remaining hardcoded English UI strings outside `locales/` should be zero for the covered surfaces.

### Step 3 — Indonesian demo menu & seed data [PARTIAL]
- Replace `src/data.ts:menuItems` (8 Western dishes) with 10–12 Indonesian dishes + drinks covering `categories` remapped to Indonesian-friendly set: `['Semua','Makanan Pembuka','Makanan Utama','Dari Laut','Minuman']` (keep English `categories` as translation keys; actual category values stored in DB should be canonical slugs `small-plates|mains|from-the-sea|drinks` but display via i18n). New items (example set, finalize with search): `Ayam Goreng Kremes`, `Rendang Sapi`, `Nasi Goreng Kampung`, `Sate Ayam Madura`, `Gado-Gado`, `Soto Ayam Lamongan`, `Ikan Bakar Jimbaran`, `Tempe Mendoan`, `Es Teh Manis`, `Es Jeruk`, `Kopi Tubruk`, `Es Cendol` — each with Indonesian description, price in IDR (e.g. `35000`–`95000`), realistic Unsplash image, `tag`/`accent` preserved.
- Update `src/data.ts:restaurants` demos: `Salt & Ember` → `Warung Nusantara` (Jakarta), `Alba House` → `Kedai Pesisir` (Bali) with Indonesian addresses/hours/story, promo examples in IDR. Update `src/data.ts:categories` and `tagSuggestions` to Indonesian defaults with English translations in `en` locale.
- **Implemented**: Indonesian D1 demo data is in `server/db/migrations/0015_indonesian_demo_menu.sql` and `0017_add_indonesian_drinks.sql`; fallback data remains in `src/data.ts` through `shouldFallbackToLocalData` in `src/api.ts:27`.
- Search Indonesian dishes/drinks to confirm names/spellings and pick appropriate images; keep `image` URLs as Unsplash, `imageKey` null for demo.

### Step 4 — Superadmin: create users + assign restaurant [DONE]
- **DB**: Implemented in `server/db/migrations/0011_username_and_membership.sql`; adds nullable usernames, the `restaurant_members` junction, ownership compatibility, and membership indexes.
- **Server** (`server/index.ts`): Add `POST /api/superadmin/users` with `zValidator` schema `{ email: z.string().email(), name: z.string().min(1).max(80), username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/), password: z.string().min(8).max(128), role: z.enum(['user','superadmin']).default('user'), restaurantIds: z.array(z.string()).optional() }`. Handler: `getSessionAndRole` → 403 if not superadmin; check `user` email/username uniqueness (409 on conflict); create via `authWithEmail(c, origin).api.signUpEmail` or direct `better-auth` admin create (use `auth.api.createUser` if available, else insert into `user` + `account` with hashed password via `better-auth`'s `hashPassword` util — inspect `node_modules/better-auth/dist` for `hashPassword` export; fallback to `POST /api/auth/sign-up/email` with superadmin session if needed). On success, insert into `restaurant_members` for each `restaurantIds` and update `restaurants.owner_id` for first assignment if restaurant has no owner. Return `{ user }`. Add `GET /api/superadmin/users` already exists — extend to include `username` and `restaurantIds` via join.
- **Client** (`src/api.ts`): Add `createSuperadminUser(input)` and `assignRestaurantsToUser(userId, restaurantIds)` (or single endpoint). In `src/features/superadmin/Superadmin.tsx:UsersPanel`, add "Buat Pengguna" dialog with fields: name, username, email, password, role select, restaurant multi-select (from `fetchSuperadminRestaurants`). On submit, call `createSuperadminUser` then invalidate `["superadmin","users"]`.
- **Validation**: Username `^[a-z0-9_]{3,30}$` lowercased; email normalized lower; password min 8; show 409 errors inline.

### Step 5 — Superadmin: manage users (password, email, username, assigned restaurants) [DONE]
- **DB**: No new tables beyond Step 4.
- **Server**: Extend `PATCH /api/superadmin/users/:id` (currently only `role`) to accept `z.object({ role: ..., name: ..., username: ..., email: ..., password: ..., restaurantIds: z.array(z.string()).optional() }).partial()`. For each field: `username` → uniqueness check; `email` → uniqueness + `emailVerified` reset if changed; `password` → hash and update `account.password` where `providerId='credential'`; `restaurantIds` → replace junction rows in transaction (delete where `user_id=:id` then insert new). Add `POST /api/superadmin/users/:id/reset-password` alternative if prefer separate endpoint; but single PATCH is simpler. Keep `DELETE /api/superadmin/users/:id` as is (also delete `restaurant_members`).
- **better-auth email change**: Use `auth.api.updateUser` or direct `UPDATE user SET email=:email, emailVerified=0` + `UPDATE account SET accountId=:email WHERE userId=:id AND providerId='credential'` to keep credential login working; verify by reading `server/auth.ts` `user.changeEmail` config (`updateEmailWithoutVerification: true`).
- **Client**: In `UsersPanel`, add row actions: Edit (drawer with name/username/email/role/restaurant multi-select), Reset Password (dialog with new password + confirm), Delete. Add `updateSuperadminUser(id, patch)` and `resetSuperadminPassword(id, password)` in `src/api.ts`. Table uses Step 7's DataTable (search/filter/sort) — wire username column as well.
- **Edge**: Prevent superadmin from demoting/deleting self (403 if `id === session.user.id` and `role` change to `user` or delete).

### Step 6 — Campaigns & Broadcasts (rename + history + tags) [PARTIAL]
- **DB**: Implemented in `server/db/migrations/0012_campaigns.sql`; stores campaign content, audience, tags, category, status, recipient count, creator, and timestamps.
- **Server**: Rename `POST /api/superadmin/broadcast` to `POST /api/superadmin/campaigns` (keep old path as alias returning same). New handler inserts into `campaigns` before sending emails, then sends via `Resend` (existing `server/email.ts:sendBroadcast` pattern), updates `sent_count`/`sent_at`. Add `GET /api/superadmin/campaigns?tag=&category=&q=&sort=&order=&page=&limit=` returning `{ campaigns, total }` with fuzzy `q` on `subject|html|text` via `LIKE '%q%'` (or FTS5 if available) and exact filters on `tags` (JSON `LIKE`) and `category`. Add `GET /api/superadmin/campaigns/:id`.
- **Client**: Rename `BroadcastPanel` → `CampaignsPanel`, route `/app/campaigns` (and keep `/superadmin/broadcast` redirect). UI: top "Buat Kampanye" button opening form (subject, html/text, audience, tags input with suggestions `promo|announcement|update|seasonal`, category select `promo|announcement|newsletter|system`). Below, history list/table of sent campaigns with columns: subject, audience, category, tags, sent_at, sent_count, status. Add tag/category filter chips and search bar (Step 7). Click row → detail drawer with rendered html preview.
- **i18n**: Title "Kampanye & Siaran" (id) / "Campaigns & Broadcasts" (en).

### Step 7 — Fuzzy search, filters, sort on all tables/lists [PARTIAL]
- Create `src/components/DataTable.tsx` reusable component (no existing table abstraction; current tables are ad-hoc `div`/`table` in `UsersPanel`, `RestaurantsPanel`, `WaitlistPanel`, `MenuManager`). Props: `data: T[]`, `columns: ColumnDef<T>[]` with `accessorKey`, `header`, `sortable`, `filterType: 'text'|'select'|'multi'`, `filterOptions?`, `enableFuzzy?: boolean`, `onRowClick?`, `initialSort?`. Internals: local state `query`, `filters: Record<string,string>`, `sort: { key, dir }`. Fuzzy search via `fuse.js` (add dep) or simple `fuse-lite` (if want zero dep, implement `fuzzyMatch(haystack, needle)` scoring by subsequence + `toLowerCase` includes). Filtering: exact match for select, `includes` for multi. Sorting: `localeCompare` for strings, numeric for numbers, `Intl.Collator` with `sensitivity:'base'` for id locale.
- Apply to: `UsersPanel` (search name/email/username, filter role, sort name/email/createdAt), `RestaurantsPanel` (search name/slug, filter published, sort name/createdAt), `WaitlistPanel` (search email/restaurantName, filter date range, sort createdAt), `MenuManager` list (search name/description/category, filter category/status/tag, sort name/price/sort_order), `CampaignsPanel` (search subject, filter audience/category/tags, sort sent_at). Each panel passes `columns` and `data` from existing queries; no server-side pagination initially (client-side for <1k rows; add server pagination later if needed).
- Add URL sync for table state via `useSearch` (`?q=&sort=&filter_role=`) so refresh preserves search/filter (ties into Step 1 URL-driven pattern). Debounce search input 200ms.
- Empty state: "Tidak ada hasil" / "No results" with clear filters button.

### Step 8 — Promo & Discount engine (Shopify-like) [PARTIAL]
- **DB**: Implemented in `server/db/migrations/0013_promos.sql`:
  ```sql
  CREATE TABLE promos (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK(type IN ('percentage','fixed','bogo','bundle','free_shipping','custom')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','scheduled','expired','archived')),
    badge TEXT,
    valid_from TEXT, valid_until TEXT,
    usage_limit INTEGER, usage_count INTEGER DEFAULT 0,
    min_purchase REAL, -- minimum cart/order value
    applies_to TEXT NOT NULL DEFAULT 'all' CHECK(applies_to IN ('all','categories','items')),
    applies_ids TEXT NOT NULL DEFAULT '[]', -- JSON array of category slugs or item ids
    stackable INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE promo_rules (
    id TEXT PRIMARY KEY,
    promo_id TEXT NOT NULL REFERENCES promos(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL CHECK(rule_type IN ('buy_x_get_y','min_qty','min_amount','time_window','first_order')),
    config TEXT NOT NULL DEFAULT '{}' -- JSON e.g. {"buy":2,"get":1,"discount":"100%"} or {"minQty":3}
  );
  CREATE INDEX promos_restaurant_idx ON promos(restaurant_id, status, valid_until);
  ```
  Extend `menu_items` with `promo_id TEXT REFERENCES promos(id) ON DELETE SET NULL` if want direct linkage, but prefer `applies_ids` for flexibility.
- **Server**: CRUD `GET/POST /api/admin/promos`, `PATCH/DELETE /api/admin/promos/:id`, `POST /api/admin/promos/:id/activate|archive`, and superadmin equivalents `GET /api/superadmin/restaurants/:id/promos`. Validation via `zod` schemas mirroring Shopify's `discount` model: `percentage` requires `value 1-100`, `fixed` requires `amount`, `bogo` requires `promo_rules` with `buy_x_get_y`, `bundle` requires `minQty` + `bundlePrice`. Enforce `valid_from < valid_until` if both set. On `GET /api/menu/:slug`, include `promos` array of active promos (where `status='active' AND (valid_until IS NULL OR valid_until > now)`) and for each `menu_item` compute `effectivePrice` server-side (apply best non-stackable promo, or stack if `stackable=1`).
- **Client**: New page `src/routes/app.promos.tsx` → `src/features/workspace/PromosPanel.tsx`. UI sections: (a) Promo list table (Step 7 DataTable) with status badge, type, validity, usage; (b) Create/Edit drawer with fields: title, description, type select, value/amount, applies_to (All / Kategori / Item tertentu with multi-select from `fetchAdminItems` categories/items), valid_from/until datetime, usage_limit, stackable toggle, rules builder for BOGO/bundle (buy X get Y, min qty). (c) Preview of affected items and price preview. Use `src/components/ui/*` (Dialog, Select, Input) already in repo.
- **Public menu**: `src/features/public/PublicMenu.tsx` renders promo badge on items where `effectivePrice < price` (strikethrough original, show discounted), and top banner if promo is `bundle`/`custom` (Step 9).

### Step 9 — Banner settings ↔ promo/announcement linkage [PARTIAL]
- **DB**: Implemented in `server/db/migrations/0014_banner_currency.sql`; adds banner type, promo link, announcement, dismissibility, and currency columns. Legacy `promo` JSON has not been migrated.
- **Server**: Extend `restaurantSettingsSchema` (in `server/index.ts`) to include `bannerType`, `bannerPromoId`, `bannerAnnouncement`, `bannerDismissible`, `currency`. Update `PATCH /api/admin/restaurant` and `PATCH /api/superadmin/restaurants/:id` to persist these. On `GET /api/menu/:slug` and `GET /api/admin/restaurants`, include `banner` object `{ type, promo, announcement, dismissible }` where `promo` is resolved from `promos` table if `banner_promo_id` set.
- **Client**: In `src/features/workspace/MenuSettingsPanel.tsx`, replace single promo fields with Banner section: radio `Tidak ada / Promo / Pengumuman`; when `Promo` → searchable select of active promos (from `fetchAdminPromos`); when `Pengumuman` → textarea for announcement text + badge. Show preview banner above menu preview. Public menu `PublicMenu.tsx` renders banner at top if `banner.type !== 'none'` (dismissible via localStorage key `menusa-banner-dismissed-{slug}`).
- **i18n**: Labels "Spanduk" / "Banner", "Pilih promo" / "Choose promo", "Pengumuman" / "Announcement".

### Step 10 — Currency format per restaurant (IDR default) [PARTIAL]
- **DB**: Covered by `currency` column in Step 9 migration (`TEXT DEFAULT 'IDR'`). Add `CHECK(currency IN ('IDR','USD','EUR','SGD','MYR','JPY'))` or free-form `TEXT` with app-level validation; prefer `CHECK` with common set plus allow custom via `currency_custom` if needed. Default `IDR` for new restaurants (`POST /api/admin/restaurants` and `POST /api/superadmin/restaurants` set `currency='IDR'` if not provided).
- **Server**: Include `currency` in `GET /api/menu/:slug`, `GET /api/admin/restaurants`, `GET /api/superadmin/restaurants` responses. No conversion — just formatting.
- **Client**: Create `src/lib/currency.ts` with `formatPrice(value: number|string, currency: string, locale: string)` using `Intl.NumberFormat(locale, { style:'currency', currency, maximumFractionDigits: currency==='IDR'||currency==='JPY'?0:2 })`. Locale mapping: `id` → `id-ID`, `en` → `en-US` (but currency still `IDR` if restaurant is IDR). Update every price render: `src/features/public/PublicMenu.tsx`, `src/features/workspace/MenuManager.tsx`, `src/features/workspace/AddItemModal.tsx` (price input prefix), `src/features/superadmin/Superadmin.tsx` restaurant detail, `src/features/landing/Landing.tsx` demo prices. In `MenuSettingsPanel`, add Currency select (default `IDR (Rp)`, options `IDR`, `USD ($)`, `EUR (€)`, `SGD (S$)`, `MYR (RM)`, `JPY (¥)`) with live preview `formatPrice(50000, selectedCurrency, i18n.language)`.
- **Demo data**: Runtime formatting is implemented; fixture prices in `src/data.ts` remain string values and are tracked as outstanding work under Step 3.

## Critical Files & Anchors
- `src/features/workspace/Admin.tsx` and `src/features/superadmin/Superadmin.tsx` — now legacy redirects; active navigation lives in `src/features/app/AppShell.tsx` and `/admin/*` route files.
- `src/router.tsx:4-6` — `scrollRestoration: true` and URL-driven navigation are implemented for the canonical `/admin` workspace.
- `server/index.ts:160-228` — superadmin user/broadcast handlers and `restaurantSettingsSchema` to extend for username/members/campaigns/promos/banner/currency.
- `src/data.ts` — Indonesian fixture data is implemented; category canonicalization and promo model alignment remain partial.
- `server/db/migrations/0010_restaurant_extras.sql` — baseline for the later feature migrations; related current migrations continue through `0020_demo_structured_hours.sql`.

## Verification targets
- **i18n**: `npm run dev` (vite on 5173 + wrangler on 8787), open `/` — landing shows Bahasa by default; toggle to English via switcher persists after reload (`localStorage menusa-lng`); `/admin` panels and `/$slug` public menus also switch. Check `<html lang="id">` → `en` on toggle.
- **Demo data**: `GET /api/menu/restaurant-1` (or fallback `src/data.ts`) returns Indonesian items (e.g. `Rendang Sapi`, `Nasi Goreng`); landing demo grid shows same; prices render as `Rp35.000` when restaurant currency `IDR` and locale `id`.
- **Routing**: Navigate `/admin` → click a child workspace route → the URL changes; browser Back returns to the prior route; refresh stays on the same route. `/app` and `/superadmin` redirect to `/admin`.
- **User lifecycle**: As superadmin, `POST /api/superadmin/users` with `{ email, username, password, restaurantIds }` → 200 and user appears in `GET /api/superadmin/users`; login as new user succeeds; `PATCH /api/superadmin/users/:id` changing email/username/password/restaurants reflects on next login and `GET /api/superadmin/users`.
- **Campaigns**: `POST /api/superadmin/campaigns` with tags `["promo"]` category `promo` → appears in `GET /api/superadmin/campaigns?category=promo`; UI list at `/app/campaigns` shows history with tag chips and filter; old `POST /api/superadmin/broadcast` still works (alias).
- **Tables**: Every table (users, restaurants, waitlist, menu items, campaigns, promos) has search input filtering rows fuzzily (e.g. typing `rend` matches `Rendang`), column filters (select/multi) and clickable sortable headers; URL query `?q=rend&sort=name&order=asc` restores state after refresh.
- **Promos**: Create promo type `percentage 20%` applies to `Makanan Utama` → `GET /api/menu/:slug` returns `effectivePrice` 20% off for those items; public menu shows strikethrough + badge; banner set to that promo shows at top. Create `bogo buy 2 get 1` → rule stored in `promo_rules` and reflected in menu detail.
- **Currency**: Change restaurant currency from `IDR` to `USD` in Menu Settings → prices reformat to `$12.00` immediately and persist after reload; new restaurant defaults to `IDR`.
- **Commands**: `npm run typecheck` and `npm run build` pass; `npm test` (if present) passes; manual check via `wrangler d1 execute DB --local --command "SELECT sql FROM sqlite_master WHERE type='table'"` shows new tables/columns.

## Assumptions & Contingencies
- **i18n library**: Assume `i18next` + `react-i18next` is acceptable (most common for Vite React); if team prefers `next-intl`-style or custom context, swap implementation but keep locale files and `id` default contract.
- **Canonical route prefix**: The current implementation uses `/admin`; `/app` and `/superadmin` remain compatibility redirects.
- **better-auth user creation**: If `better-auth` has no `auth.api.createUser` for superadmin, fallback is direct D1 insert into `user`/`account` with `better-auth`'s password hasher (inspect `better-auth/dist/crypto`); if hasher not exported, use `POST /api/auth/sign-up/email` with superadmin session and then patch role — document chosen path in code comment.
- **Promo scope**: If Shopify-like engine is too heavy for iteration, ship `percentage`/`fixed`/`bogo` first and leave `bundle`/`free_shipping` as `custom` with JSON config, behind feature flag `promoAdvanced`.
- **Currency**: No FX conversion; `currency` only affects `Intl.NumberFormat`. If need multi-currency per item, add `price_currency` per item later — current plan is per-restaurant.
- **Demo data images**: If Unsplash Indonesian food images 404, fallback to existing `imageKey` upload path or placeholder; don't block seed on image availability.
