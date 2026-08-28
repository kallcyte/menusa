## Context

Menusa is a QR-menu-only SaaS (no POS, no table ordering, no inventory) — a photo-led public menu at `/api/menu/:slug` with admin CRUD for restaurants + menu items (D1 `restaurants`/`menu_items`, R2 images, Better Auth). Founder wants exactly 2 tiers — Free and Paid — targeting general Indonesia SMEs (warung, kedai kopi, cafe kecil, resto kecil). Unsure what IDR price is defensible and which features justify paywall. Candidates confirmed viable: custom domain via Cloudflare for SaaS, multiple restaurants per account, higher menu-item cap. Need a decision-complete spec for pricing, entitlement matrix, and minimal code to enforce it without building a full billing system on day one.

End state: Free is generous enough to get adoption (1 outlet, ~30 items covers most warungs) but hits a natural ceiling; Paid at Rp49k–59k/mo unlocks growth features and is implementable as D1-enforced limits + UI upsell, with manual superadmin upgrade first and Midtrans later. No paywall on safety/inclusivity features (allergy/halal).

## Approach

### Step 1 — Lock pricing and entitlement matrix (no code, but every later step depends on these numbers)

Decision (based on 2025-2026 ID QR-menu comps: Netdigi Lite Rp10k/thn-annual or Rp29k/mo, Pro Rp49k/thn-annual or Rp119k/mo; Kasigo Free 1 lokasi/30 menu, Warung Rp99k/mo, Restoran Rp249k/5 lokasi; QRes Starter Rp99k/3 meja, Pro Rp299k; Labamu QR Rp150k/10 meja; SmartMenu from Rp4.9k promo):

- **Free (Rp0 forever, no card):** 1 restaurant per user, 30 published+draft menu items per restaurant (archived excluded), `yourname.menusa.id` subdomain only, "Made with Menusa" badge required, community support, all core menu features (photos, categories, reorder, search, allergy/ingredients/dietary/halal/spice).
- **Pro — Rp59.000 / bulan ditagih bulanan, atau Rp499.000 / tahun (hemat ~30%, ~Rp41.500/bulan, framing "Rp1.900/hari"):** Alternative if founder wants lower friction: Rp49.000/mo / Rp390.000/yr — pick one before Step 2 and freeze it. Pro entitlements: up to 3 restaurants per user (covers 95% of SME multi-outlet; "unlimited" is a support risk), 150 items per restaurant, custom domain (1 per restaurant, Cloudflare for SaaS), remove Menusa badge toggle, scan/view analytics (future), priority WA/email support. Annual gets 2 months free — standard ID expectation (15–20% off).
- **Why this price:** Menusa is QR-only, so must undercut POS+QR (Rp99k–299k). Rp49k–59k sits just above Netdigi Pro annual (Rp49k) but well below QRes/Kasigo paid, matches warung willingness (Rp10k–99k for simple QR, Rp99k+ only if POS included). Rp1.600–1.900/hari framing is critical for warung psychology; avoid $ pricing.
- **Do NOT gate:** allergen/dietary/halal/ingredients, publish/unpublish, image upload, category/reorder — gating safety or core editing kills trust and conversion.
- **Defer to Pro v2 (do not build now, just reserve column):** high-res QR export, custom accent/theme, menu scheduling, team members. Mention on pricing page as "coming soon" to increase perceived value without scope.

If founder insists on Rp99k to match POS comps, keep entitlements identical and add "3 restaurants + 150 items" justification; do not raise free limit to compensate.

### Step 2 — DB schema: add plan to user, limits are derived not per-restaurant

Reuse existing `user` table (Better Auth D1). No new subscription vendor table for MVP.

Migration `0010_plans.sql`:
```sql
ALTER TABLE user ADD COLUMN plan TEXT NOT NULL DEFAULT 'free' CHECK(plan IN ('free','pro'));
ALTER TABLE user ADD COLUMN plan_expires_at TEXT; -- ISO8601, null = lifetime free or lifetime pro (manual)
-- Optional for custom domain (create now, enforce later):
CREATE TABLE IF NOT EXISTS custom_domains (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  hostname TEXT NOT NULL UNIQUE, -- e.g. menu.ayambakar-maknyus.id
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','failed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(restaurant_id)
);
CREATE INDEX IF NOT EXISTS custom_domains_hostname_idx ON custom_domains(hostname);
```

Seed: no backfill needed; all existing users default `free`. Superadmin can set `pro` manually.

Config: `server/entitlements.ts` (new file, no existing equivalent — do not reuse rate-limit) exports:
```ts
export const PLANS = {
  free: { maxRestaurants: 1, maxItemsPerRestaurant: 30, customDomain: false, removeBranding: false },
  pro:  { maxRestaurants: 3, maxItemsPerRestaurant: 150, customDomain: true, removeBranding: true },
} as const
export type Plan = keyof typeof PLANS
```

### Step 3 — Server enforcement (Hono `server/index.ts`, reuse `getSessionAndRole` + `getOwnedRestaurant`)

Add helper `getUserPlan(db, userId): Promise<Plan>` (read `user.plan` and check `plan_expires_at` > now; if expired, treat as `free` but do not auto-downgrade DB — lazy check).

Enforce at mutation boundaries, fail with 402 Payment Required (not 403) and JSON `{ error: "LIMIT_REACHED", message: "Free plan allows 30 menu items. Upgrade to Pro for 150.", upgrade: true }` so client can show upsell:

- `POST /api/admin/restaurants` — before insert, `SELECT COUNT(*) FROM restaurants WHERE owner_id = ?` compare to `PLANS[plan].maxRestaurants`. Free user with 1 existing → 402.
- `POST /api/admin/items` and `PATCH /api/admin/items/:id` (when creating via upsert or restoring archived to draft) — `SELECT COUNT(*) FROM menu_items WHERE restaurant_id = ? AND archived = 0` (or `status != 'ARCHIVED'`). If at cap, 402. Count archived = 0 so archived items don't block; user can archive to make room (intentional).
- `POST /api/admin/images` — optional: enforce R2 storage cap via item count proxy; no separate image limit for MVP (item limit already caps images).
- Custom domain endpoints (new, behind `customDomain` flag): `POST /api/admin/custom-domain` and `GET /api/admin/custom-domain` — if `!PLANS[plan].customDomain` → 402. Otherwise insert into `custom_domains` with `pending`, return instructions. Actual Cloudflare for SaaS hostname creation is manual/superadmin for MVP (call Cloudflare API via `fetch` with `CF_API_TOKEN` if configured, else leave pending). Public menu resolution: check `Host` header against `custom_domains` where `status='active'` to resolve `restaurant_id` before slug fallback. If no token, just store and let superadmin verify DNS.

Do NOT enforce on reads (`GET /api/menu/:slug`, `GET /api/admin/items`). Existing over-limit restaurants (e.g., legacy data) remain readable; only new writes are blocked.

Rate-limit and auth remain as-is; add plan check after `getSessionAndRole`.

### Step 4 — Superadmin upgrade path (no payment gateway for MVP)

Extend `PATCH /api/superadmin/users/:id` (already handles `role`) to also accept `{ plan: 'free'|'pro', planExpiresAt?: string }`. Reuse same superadmin guard (`getSessionAndRole` role === 'superadmin'). Update `user.plan`/`plan_expires_at`. Send email via existing `server/email.ts` (new `sendPlanUpgradeEmail`).

Client: `src/api.ts` add `updateSuperadminUserPlan(id, plan, expiresAt?)` and `fetchMyPlan()` → `GET /api/me/plan` (new endpoint returning `{ plan, expiresAt, entitlements: PLANS[plan] }`).

Midtrans/Xendit integration is explicitly deferred: when ready, add `POST /api/billing/create-transaction` that creates Midtrans Snap token, webhook `POST /api/billing/webhook` verifies signature and sets `user.plan='pro'`. Do not build now; leave `plan_expires_at` nullable.

### Step 5 — UI: pricing, entitlement awareness, and upsell (TanStack Start, `src/features/`)

- **New route `src/routes/pricing.tsx` + `src/features/pricing/Pricing.tsx`:** Static pricing table (Free vs Pro) in IDR, monthly/annual toggle, feature checkmarks from matrix, CTA: Free → `/login`, Pro → `/admin?upgrade=1` (or waitlist if billing not live). Copy in Indonesian: "Gratis selamanya", "Pro — Rp59.000/bulan", "Hemat 30% dengan tahunan", "Tanpa komisi transaksi", "QR tetap sama". Include FAQ: "Apa yang terjadi jika melebihi 30 menu?" → "Arsipkan menu lama atau upgrade."
- **Landing `src/features/landing/Landing.tsx`:** Replace FAQ answer for "Can I use my own web address?" from "coming soon" to "Free pakai menusa.id, Pro pakai domain sendiri (menu.restoranmu.id) via Cloudflare." Add pricing anchor link in header/nav and hero. Keep existing GSAP structure.
- **Workspace `src/features/workspace/Admin.tsx` + `MenuManager.tsx` + `AddItemModal.tsx` + `AddRestaurantModal.tsx`:** Fetch `GET /api/me/plan` via TanStack Query. Show usage bar: "12/30 menu" (free) or "12/150" (pro). When at cap, disable "Add item" / "Add restaurant" button and show upsell card: "Batas Free tercapai — Upgrade ke Pro untuk 150 menu & 3 restoran" with button to `/pricing`. Handle 402 from server: toast with `errorMessage` + inline upsell link (reuse `useToast`). Do not hide existing items.
- **Public menu `src/features/public/PublicMenu.tsx`:** If `restaurant.removeBranding === false` (or plan free), render "Made with Menusa" footer link; if pro and toggle on, hide. No other public change.
- **Account settings `src/features/auth/AccountSettingsPanel.tsx`:** Show current plan badge and expiry, link to pricing.

No new UI library; reuse `src/components/ui/*` (Button, Dialog, Input) and `lucide-react` icons (Crown, Store, Layers).

### Step 6 — Docs and seed

Update `docs/features.md` with "Plans & entitlements" section. Update `server/db/seeds/local-demo.sql` to set demo user to `pro` for testing. Add `.dev.vars.example` entries: `CF_API_TOKEN` (optional), `CF_ZONE_ID` (optional).

## Critical files & anchors

- `server/index.ts` — Hono app, all `/api/admin/*` guards and new `/api/me/plan`, `/api/admin/custom-domain` endpoints; add `getUserPlan` helper near `getSessionAndRole` (line ~81).
- `server/db/migrations/0010_plans.sql` — new migration adding `user.plan`, `user.plan_expires_at`, `custom_domains` table.
- `src/features/landing/Landing.tsx` — hero/nav/FAQ pricing copy and anchor; GSAP sections at top.
- `src/features/workspace/Admin.tsx` — workspace shell, restaurant switcher, plan fetching and upsell placement.
- `src/api.ts` — client fetchers for plan and custom domain; add `fetchMyPlan`, `updateSuperadminUserPlan`, `setCustomDomain`.

## Verification

- **DB:** `npx wrangler d1 migrations apply menusa-production --config wrangler.api.toml --local` applies 0010; `SELECT sql FROM sqlite_master WHERE name='user'` shows `plan` column; `SELECT * FROM user` defaults to `free`.
- **Enforcement:** As free user with 1 restaurant, `POST /api/admin/restaurants` → 402 `{ error: "LIMIT_REACHED" }`; as free user with 30 items, `POST /api/admin/items` → 402; after superadmin `PATCH /api/superadmin/users/:id { plan: "pro" }`, same requests → 200. Archived items not counted: create 30, archive 1, create 1 more → succeeds.
- **Custom domain gate:** Free user `POST /api/admin/custom-domain` → 402; Pro user → 200 pending.
- **UI:** Visit `/pricing` — toggle monthly/annual shows Rp59.000 vs Rp499.000; landing FAQ mentions custom domain; admin with 30/30 shows disabled Add + upsell card linking to `/pricing`; public menu free shows Menusa badge, pro with toggle hides it.
- **Existing tests:** `npm test` (tsx --test) still passes; add `tests/entitlements.test.ts` covering `PLANS` caps and `getUserPlan` expiry logic.

## Assumptions & contingencies

- Assumption: Founder wants single Pro tier at Rp59k/mo (or Rp49k). If user research shows warungs anchor at Rp29k (Netdigi Lite), fallback: keep entitlements, price at Rp39k/mo / Rp390k/yr and frame as "Rp1.300/hari" — no code change, only `Pricing.tsx` copy and superadmin manual price note.
- Assumption: Cloudflare for SaaS custom hostnames cost ~$2–5/mo per hostname at scale; margin at Rp59k still >80% per pro user. If cost higher, fallback: limit custom domain to annual Pro only (check `plan_expires_at` annual flag) — gate in `server/index.ts` without schema change.
- Assumption: Payment gateway deferred; manual superadmin upgrade is acceptable for first 50–100 paying users. If founder needs self-serve sooner, implement Midtrans Snap next (add `billing` table, webhook) — entitlements code already isolates the check to `getUserPlan`, so no rework.
- Assumption: 30 free items covers ~80% of warungs (typical 15–25 menu items). If analytics shows free users churn at 30, raise to 40 via one-line `PLANS.free.maxItemsPerRestaurant` change — no migration.
