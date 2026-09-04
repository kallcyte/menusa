---
name: layout
description: Admin/superadmin layout conventions for Menusa
---

# Layout

- All admin and superadmin content lives inside `.admin-main-inner`: `mx-auto max-w-[1180px] px-[6vw] py-[46px]` — single source of width/padding.
- `.admin-header` sits outside the inner container (full-bleed border) with matching `px-[6vw]`.
- Panels (`.manager`, `.superadmin-panel`, `.menu-settings-panel`, `.account-settings-panel`) must NOT set their own outer padding or max-width; they are `w-full` inside `admin-main-inner`.
- `QrPanel` is `w-full` (no mx-auto) for the same reason.

## Page routing

- Treat any request that says "new page" as a dedicated file-based route, not an in-page conditional view.
- Resource-scoped pages MUST use a dynamic route segment, preferring a stable `$slug` and using `$id` when no slug exists.
- Navigation, active state, back links, guards, loading, and error states MUST follow the current route.
- Use local React state for controls, dialogs, filters, and form state—not for page-level navigation.
