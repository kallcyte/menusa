# Feature Notes

## Menu browsing

- Filter state is local and URL-independent in the first slice.
- Search matches dish names and descriptions.
- Cards use `alt` text from the dish name and remain readable over image overlays.
- The layout collapses from four columns to a two-column mobile grid, with the featured item spanning the full width.
- Every public menu is addressed by a restaurant slug, for example `/restaurant-1` or `/restaurant-2`.
- The client requests `/api/menu/:slug`; local fixture data keeps the two demo tenants usable without a Worker.

## Multi-tenancy

- `restaurants.slug` is the public tenant identifier and is unique in D1.
- Admin mutations resolve the restaurant from the authenticated user's ownership, not from the public slug or a browser-provided ID.
- Public reads only return restaurants where `published = 1`.
- The current demo includes `restaurant-1` (Salt & Ember) and `restaurant-2` (Alba House); production restaurants are created during onboarding.
- The admin sidebar loads owned restaurants from `/api/admin/restaurants` and switches item queries by the selected restaurant ID.
- The account menu exposes the signed-in email, account settings, and Better Auth sign out.
- The login screen supports email/password sign-up as well as sign-in; Better Auth creates the session and the workspace can then create a restaurant.
- Account settings now call Better Auth for name/email updates, password changes, and password-confirmed account deletion.
- Email changes require an explicit confirmation and are separate from the name save to prevent accidental lockouts.
- Sign-out sends a JSON Content-Type as Better Auth requires it on all POST endpoints.
- The public menu endpoint returns only display fields (slug, name, description, address, hours); owner IDs and internal flags never leave the server.
- Local demo seed lives in `server/db/seeds/local-demo.sql`; dishes without an uploaded photo fall back to fixture imagery by name.

## Menu authoring

- The add modal validates the minimum name and price fields in the UI.
- Image upload is represented in the UI and is backed by `POST /api/admin/images` on the server.
- Publication should be treated as a restaurant-level action so a team can make several edits and publish once.
- The admin list uses TanStack Query and surfaces real load errors with a retry action; only the public demo menu falls back to fixtures (on network errors or 5xx).
- Authenticated D1 endpoints now support listing, creating, editing, archiving, and publishing menu records.
- Archive is a soft delete so old menu items remain recoverable for future audit/history features.
- Menu items now have explicit `DRAFT`, `PUBLISHED`, or `ARCHIVED` status. New items start as drafts; publishing promotes drafts, and archive/restore keeps history visible to the admin.
- The admin list has status filters for all items, drafts, published items, and archived items, plus adjacent up/down controls that persist `sort_order` through the tenant-scoped item endpoint. Public menu reads only return published items from a published restaurant.
- Each non-archived item has an Edit action that opens the prefilled menu-item modal and persists changes through `PATCH /api/admin/items/:id`.
- Draft rows have a direct Publish action; archived rows have a Restore action that returns them to Draft.
- Published rows can be moved back to Draft without archiving, removing them from the public menu while keeping them editable.
- Tags are optional, editable menu-item metadata stored in `menu_items.tag`; the add/edit modal accepts values such as `Chef's pick`, `Plant-based`, or `Bright & fresh`.
- Menu details support ingredient highlights, the UK 14 allergens, separate cross-contact warnings, dietary labels, halal status, and spice level. Guests can select a menu card to open the accessible detail dialog.
- Menu photos are validated in the Worker by magic bytes (not client-declared MIME), stored in an R2 restaurant prefix, and served with immutable caching. The public `/api/images/*` route serves only images referenced by a published item from a published restaurant; draft previews go through the authenticated `/api/admin/images/*`.
- The add-item modal uploads a selected JPG, PNG, or WebP before creating the D1 record, and surfaces upload failures instead of saving a broken key.
- Publishing persists the restaurant's live state through `POST /api/admin/publish`.

## Data flow

The browser sends admin mutations with `credentials: include`, allowing Better Auth's session cookie to reach Hono. The Worker resolves the session, finds the restaurant owned by that user, and scopes every item query by `restaurant_id`. Mutations are optimistic with snapshot/rollback: each action writes to the TanStack Query cache immediately, restores the previous items on failure, reports the outcome through toasts, and only closes the add/edit modal on a confirmed save. Admin reads never fall back to fixture data — only the public demo menu does, on network errors or 5xx.

## Access control checklist

- Authenticate every `/api/admin/*` route with Better Auth.
- Resolve the active restaurant from the authenticated membership.
- Restrict image keys to the owning restaurant prefix.
- Validate file content by magic bytes and byte size before writing to R2.
- Serve public images only for published items from published restaurants.
- Rate-limit sign-in per IP and uploads per restaurant (`server/rate-limit.ts`).
