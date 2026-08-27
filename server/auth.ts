import { betterAuth } from 'better-auth'

export function createAuth(db: D1Database, baseURL: string, secret: string) {
  // HTTPS deployments serve real users: trust only the deployed origin.
  // Local dev (http://localhost / 127.0.0.1) needs the broader allow-list.
  const isProduction = baseURL.startsWith('https://')
  return betterAuth({
    database: db,
    baseURL,
    secret,
    emailAndPassword: { enabled: true },
    user: {
      changeEmail: { enabled: true, updateEmailWithoutVerification: true },
      deleteUser: { enabled: true },
    },
    trustedOrigins: isProduction
      ? [baseURL]
      : [
          baseURL,
          'http://localhost:5173',
          'http://localhost:*',
          'http://localhost:64791',
          'http://localhost:8787',
          'http://127.0.0.1:5173',
          'http://127.0.0.1:*',
          'http://127.0.0.1:8787',
        ],
    advanced: { useSecureCookies: isProduction },
  })
}
