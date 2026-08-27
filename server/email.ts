import { Resend } from "resend"

type EmailEnv = {
  RESEND_API_KEY?: string
  EMAIL_FROM?: string
  PUBLIC_APP_URL?: string
}

function getResend(env: EmailEnv) {
  if (!env.RESEND_API_KEY) return null
  return new Resend(env.RESEND_API_KEY)
}

function fromAddress(env: EmailEnv) {
  return env.EMAIL_FROM ?? "Menusa <hello@menusa.local>"
}

function appUrl(env: EmailEnv) {
  return (env.PUBLIC_APP_URL ?? "https://menusa.local").replace(/\/$/, "")
}

export type EmailResult = { ok: true; id?: string } | { ok: false; error: string; skipped?: boolean }

async function sendEmail(env: EmailEnv, to: string, subject: string, html: string, text: string): Promise<EmailResult> {
  const resend = getResend(env)
  if (!resend) return { ok: false, error: "RESEND_API_KEY not configured", skipped: true }
  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress(env),
      to: [to],
      subject,
      html,
      text,
    })
    if (error) return { ok: false, error: error.message ?? String(error) }
    return { ok: true, id: data?.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function wrapHtml(title: string, body: string) {
  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#242622;max-width:560px;margin:0 auto;padding:24px">
  <div style="border:1px solid #e3e3dd;border-radius:16px;padding:24px;background:#fff">
    <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#777970;margin-bottom:8px">Menusa</div>
    <h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(title)}</h1>
    ${body}
    <hr style="border:none;border-top:1px solid #f0f0ea;margin:24px 0" />
    <p style="font-size:12px;color:#777970;margin:0">You're receiving this because you interacted with Menusa. If this wasn't you, ignore this email.</p>
  </div>
</body></html>`
}

// Waitlist confirmation — sent to the joiner immediately after DB insert.
export function sendWaitlistConfirmation(env: EmailEnv, to: string, restaurantName?: string | null) {
  const namePart = restaurantName ? ` for <strong>${escapeHtml(restaurantName)}</strong>` : ""
  const subject = "You're on the Menusa waitlist"
  const html = wrapHtml(
    "You're on the list",
    `<p style="margin:0 0 12px">Thanks for joining the Menusa waitlist${namePart} — we'll let you know as soon as your menu workspace is ready.</p>
     <p style="margin:0 0 16px">In the meantime, you can explore a live demo at <a href="${appUrl(env)}/restaurant-1">${appUrl(env)}/restaurant-1</a>.</p>
     <p style="margin:0"><a href="${appUrl(env)}" style="display:inline-block;background:#252723;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-size:13px;font-weight:600">Visit Menusa</a></p>`,
  )
  const text = `You're on the Menusa waitlist${restaurantName ? ` for ${restaurantName}` : ""}.\n\nWe'll let you know as soon as your menu workspace is ready. Demo: ${appUrl(env)}/restaurant-1`
  return sendEmail(env, to, subject, html, text)
}

// Promotion — sent when a user is promoted to superadmin.
export function sendPromotionEmail(env: EmailEnv, to: string, name: string) {
  const subject = "You've been promoted to Superadmin on Menusa"
  const html = wrapHtml(
    "You're now a Superadmin",
    `<p style="margin:0 0 12px">Hi ${escapeHtml(name)},</p>
     <p style="margin:0 0 12px">You've been promoted to <strong>Superadmin</strong> on Menusa. You now have access to the platform dashboard at <a href="${appUrl(env)}/superadmin">${appUrl(env)}/superadmin</a> — waitlist, users, and all restaurants.</p>
     <p style="margin:0"><a href="${appUrl(env)}/superadmin" style="display:inline-block;background:#e75f45;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-size:13px;font-weight:600">Open Superadmin</a></p>`,
  )
  const text = `Hi ${name},\n\nYou've been promoted to Superadmin on Menusa. Open ${appUrl(env)}/superadmin to manage waitlist, users, and restaurants.`
  return sendEmail(env, to, subject, html, text)
}

// Demotion notice.
export function sendDemotionEmail(env: EmailEnv, to: string, name: string) {
  const subject = "Your Menusa role was updated"
  const html = wrapHtml(
    "Your role was updated",
    `<p style="margin:0 0 12px">Hi ${escapeHtml(name)},</p><p style="margin:0">Your Menusa role was changed to <strong>user</strong>. You still have access to your restaurant workspaces at <a href="${appUrl(env)}/admin">${appUrl(env)}/admin</a>.</p>`,
  )
  const text = `Hi ${name},\n\nYour Menusa role was changed to user. Your workspaces are still at ${appUrl(env)}/admin.`
  return sendEmail(env, to, subject, html, text)
}

// Generic broadcast — superadmin composes subject/body; sent to a list.
export async function sendBroadcast(env: EmailEnv, recipients: string[], subject: string, htmlBody: string, textBody: string) {
  const resend = getResend(env)
  if (!resend) return { ok: false as const, error: "RESEND_API_KEY not configured", skipped: true as const }
  const chunks: string[][] = []
  for (let i = 0; i < recipients.length; i += 100) chunks.push(recipients.slice(i, i + 100))
  for (const chunk of chunks) {
    const { error } = await resend.batch.send(
      chunk.map((to) => ({
        from: fromAddress(env),
        to,
        subject,
        html: wrapHtml(subject, htmlBody),
        text: textBody,
      })),
    )
    if (error) return { ok: false as const, error: error.message ?? String(error) }
  }
  return { ok: true as const }
}

// Better Auth hook — email verification.
export function sendVerificationEmail(env: EmailEnv, to: string, url: string) {
  const subject = "Verify your Menusa email"
  const html = wrapHtml(
    "Verify your email",
    `<p style="margin:0 0 12px">Click the button below to verify your email for Menusa. This link expires in 1 hour.</p>
     <p style="margin:0 0 16px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#252723;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-size:13px;font-weight:600">Verify email</a></p>
     <p style="font-size:12px;color:#777970;word-break:break-all">Or copy: ${escapeHtml(url)}</p>`,
  )
  const text = `Verify your Menusa email: ${url} (expires in 1 hour)`
  return sendEmail(env, to, subject, html, text)
}

export function sendPasswordResetEmail(env: EmailEnv, to: string, url: string) {
  const subject = "Reset your Menusa password"
  const html = wrapHtml(
    "Reset your password",
    `<p style="margin:0 0 12px">We received a request to reset your Menusa password.</p>
     <p style="margin:0 0 16px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#252723;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-size:13px;font-weight:600">Reset password</a></p>
     <p style="font-size:12px;color:#777970;word-break:break-all">Or copy: ${escapeHtml(url)}</p>`,
  )
  const text = `Reset your Menusa password: ${url}`
  return sendEmail(env, to, subject, html, text)
}
