import { betterAuth } from 'better-auth'

export function createAuth(
  db: D1Database,
  baseURL: string,
  secret: string,
  opts?: {
    sendVerificationEmail?: (data: { user: { email: string }; url: string }) => Promise<void>
    sendResetPassword?: (data: { user: { email: string }; url: string }) => Promise<void>
  },
) {
  const isProduction = baseURL.startsWith('https://')
  return betterAuth({
    database: db as unknown as BetterAuthOptions["database"],
    baseURL,
    secret,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      sendResetPassword: opts?.sendResetPassword
        ? async (data: { user: { email: string }; url: string }) => {
            await opts.sendResetPassword?.(data)
          }
        : undefined,
    },
    emailVerification: opts?.sendVerificationEmail
      ? {
          sendOnSignUp: true,
          autoSignInAfterVerification: true,
          sendVerificationEmail: async (data: { user: { email: string }; url: string }) => {
            await opts.sendVerificationEmail?.(data)
          },
        }
      : undefined,
    user: {
      additionalFields: {
        role: { type: "string", required: false, defaultValue: "user", input: false },
      },
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

type BetterAuthOptions = Parameters<typeof betterAuth>[0]
