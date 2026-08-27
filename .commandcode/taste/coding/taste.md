# Coding

- Mirrors existing project conventions when adding code/tests — reads neighboring files first and matches their style/framework rather than introducing a new one (e.g., adopted the project's node:test + node:assert/strict style in tests/*.test.ts). Confidence: 0.7
- Extracts pure, reusable logic into small standalone modules decoupled from framework wiring so it stays unit-testable (e.g., moved magic-byte sniffing out of the Hono worker into server/images.ts "so tests can import it without spinning up the whole app"; same pattern as server/rate-limit.ts). Confidence: 0.65
- Holds frontend work to a polish bar: dedicated error/404 and empty states, skeleton loaders shown only for initial loads (not background refetches), broken-image fallback tiles, and accessibility support (prefers-reduced-motion media query, WCAG AA text contrast, aria roles/labels + keyboard handlers). Confidence: 0.6
- Prefers conservative PWA/service-worker caching: cache static assets/images and safe data only — never HTML/the app shell — explicitly so a deploy can't leave users stranded on a stale UI. Confidence: 0.6
