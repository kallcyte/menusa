---
name: layout
description: Admin/superadmin layout conventions for Menusa
---

# Layout

- All admin and superadmin content lives inside `.admin-main-inner`: `mx-auto max-w-[1180px] px-[6vw] py-[46px]` — single source of width/padding.
- `.admin-header` sits outside the inner container (full-bleed border) with matching `px-[6vw]`.
- Panels (`.manager`, `.superadmin-panel`, `.menu-settings-panel`, `.account-settings-panel`) must NOT set their own outer padding or max-width; they are `w-full` inside `admin-main-inner`.
- `QrPanel` is `w-full` (no mx-auto) for the same reason.
