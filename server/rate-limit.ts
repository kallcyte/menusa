/// <reference types="@cloudflare/workers-types" />

/** Best-effort client IP: Cloudflare sets cf-connecting-ip; fall back to common hop headers. */
export function clientIp(headers: Headers): string {
  return (
    headers.get('cf-connecting-ip') ??
    headers.get('x-real-ip') ??
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  )
}

/**
 * Fixed-window rate limit backed by D1.
 * Returns true when the request is allowed (within `limit` hits per `windowMs`).
 */
export async function checkRateLimit(
  env: { DB: D1Database },
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  try {
    const windowStart = Math.floor(Date.now() / windowMs)
    await env.DB.prepare(
      `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
       ON CONFLICT(key) DO UPDATE SET
         window_start = excluded.window_start,
         count = CASE WHEN rate_limits.window_start = excluded.window_start THEN rate_limits.count + 1 ELSE 1 END`,
    )
      .bind(key, windowStart)
      .run()
    const row = await env.DB.prepare('SELECT count FROM rate_limits WHERE key = ?')
      .bind(key)
      .first<{ count: number }>()
    // Fail open on any DB hiccup so a missing/permission-errored table never locks out real traffic.
    return (row?.count ?? 1) <= limit
  } catch {
    return true
  }
}