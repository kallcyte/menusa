# Menusa local installation and development

This guide sets up Menusa on a new computer for local development. The local setup uses:

- Vite and TanStack Start for the web UI
- A local Cloudflare Workers runtime through Wrangler
- A local D1 database for auth, restaurants, and menu data
- A local R2 simulation for image uploads

A Cloudflare account is not required for normal local development.

## 1. Prerequisites

Install these tools first:

- Git
- Node.js `20.19+` or `22.12+`
- npm, included with Node.js
- OpenSSL, optional but recommended for generating the local auth secret

Check the versions:

```bash
git --version
node --version
npm --version
```

Vite currently requires Node.js `20.19+` or `22.12+`. Avoid using an older Node.js version.

## 2. Clone the repository

```bash
git clone git@github.com:kallcyte/menusa.git
cd menusa
```

If SSH is not configured on the new computer, use HTTPS instead:

```bash
git clone https://github.com/kallcyte/menusa.git
cd menusa
```

Install the exact dependency versions from `package-lock.json`:

```bash
npm ci
```

If `npm ci` reports that the lockfile and `package.json` are out of sync, use `npm install` once and commit the resulting lockfile change only when intentionally updating dependencies.

## 3. Configure local Worker variables

Create the local-only Wrangler variables file:

### macOS/Linux

```bash
cp .dev.vars.example .dev.vars
```

### Windows PowerShell

```powershell
Copy-Item .dev.vars.example .dev.vars
```

Generate a random auth secret:

```bash
openssl rand -hex 32
```

If OpenSSL is unavailable, use Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Open `.dev.vars` and replace the placeholder values. A useful local configuration is:

```dotenv
BETTER_AUTH_SECRET="paste-a-new-64-character-hex-secret-here"
SUPERADMIN_EMAIL="your-email@example.com"
PUBLIC_APP_URL="http://localhost:5173"
EMAIL_FROM="Menusa <hello@menusa.example.com>"
```

`RESEND_API_KEY` is optional. Leave it out or blank during normal development. Add a real Resend key only when testing email delivery, and use a verified `EMAIL_FROM` address.

Important:

- `.dev.vars` is ignored by Git. Never commit it.
- Use a different secret on every computer and environment.
- Set `SUPERADMIN_EMAIL` to the lowercase email address that should receive local superadmin access.
- The superadmin promotion is based on the authenticated email. There is no shared default local password.

The repository also contains `.env.example` for general application environment documentation. Worker secrets belong in `.dev.vars`, not in committed files.

## 4. Initialize the local D1 database

Apply all database migrations from `server/db/migrations`:

```bash
npx wrangler d1 migrations apply menusa-production --local --config wrangler.api.toml
```

Check the migration status when needed:

```bash
npx wrangler d1 migrations list menusa-production --local --config wrangler.api.toml
```

Wrangler stores local D1 and R2 state under `.wrangler/`. That directory is local to each computer and is ignored by Git.

The migrations create the schema, but they do not create a normal developer account or password. Each developer should create their own account through the login page.

## 5. Start Menusa

The normal development command starts both services:

```bash
npm run dev
```

This starts:

| Service | URL | Purpose |
| --- | --- | --- |
| Vite/TanStack Start | `http://localhost:5173` | Web UI and SSR app |
| Hono/Cloudflare Worker | `http://localhost:8787` | API, Better Auth, D1, and R2 |

The Vite server proxies `/api/*` requests to the Worker on port `8787`. Keep both services running in the same terminal session.

Verify that the API is running:

```bash
curl http://localhost:8787/api/health
```

Expected response:

```json
{"ok":true}
```

Open these pages in a browser:

- `http://localhost:5173/` — landing page
- `http://localhost:5173/login` — sign in or create an account
- `http://localhost:5173/admin` — authenticated restaurant workspace
- `http://localhost:5173/app/restaurants` — application restaurant management
- `http://localhost:5173/superadmin` — superadmin dashboard
- `http://localhost:5173/demo` — public demo fixture/menu route

## 6. Create a local developer account

1. Open `http://localhost:5173/login`.
2. Switch to sign-up mode.
3. Create an account using the same email configured as `SUPERADMIN_EMAIL` if you need superadmin access.
4. Sign in again if the page does not redirect automatically.
5. Open `/admin` and create a restaurant from the workspace.

The account is stored in the local D1 database. It is independent from production and from other developers' machines.

If the account already existed before `SUPERADMIN_EMAIL` was configured, sign out and sign in again. The API promotes the matching email to `superadmin` when the session is resolved.

## 7. Local menu data

There are two types of local menu data:

1. **Fixture data** in `src/data.ts` keeps public demo screens useful when the API is unavailable.
2. **D1 data** is used by authenticated admin screens and by published API-backed menus.

For a fresh local database, use the UI to create a restaurant and add menu items. The admin workspace requires the Worker and D1 to be running.

`server/db/seeds/local-demo.sql` is an optional development seed. It adds sample dishes to an existing restaurant with the slug `restaurant-1`; it does not create the restaurant itself. Run it only when that restaurant already exists:

```bash
npx wrangler d1 execute menusa-production --local --config wrangler.api.toml --file=server/db/seeds/local-demo.sql
```

The seed file is for local development only. Its current SQL uses plain `INSERT` statements, so run it once per local database unless you intentionally want duplicate sample items. Never run it against a remote or production database.

To inspect local data:

```bash
npx wrangler d1 execute menusa-production --local --config wrangler.api.toml --command="SELECT id, slug, name, published FROM restaurants;"
```

## 8. Daily development workflow

After pulling changes from Git:

```bash
git pull
npm ci
npx wrangler d1 migrations apply menusa-production --local --config wrangler.api.toml
npm run dev
```

Run `npm ci` when dependencies or lockfiles changed. Running the migration command repeatedly is safe; Wrangler applies only migrations that have not been applied locally.

Before opening a pull request or pushing a substantial change:

```bash
npm run typecheck
npm test
npm run build
```

Useful commands:

```bash
npm run dev          # Start UI and API together
npm run dev:worker   # Start only the API Worker on port 8787
npm run build        # Create the production web build
npm run preview      # Preview the built web application
```

If you start the Worker separately with `npm run dev:worker`, start the UI in another terminal with:

```bash
npx vite
```

Do not run `npm run dev` at the same time as `npm run dev:worker`; both commands try to use port `8787`.

## 9. Adding or changing database schema

1. Create the next numbered SQL migration in `server/db/migrations/`.
2. Apply it locally:

   ```bash
   npx wrangler d1 migrations apply menusa-production --local --config wrangler.api.toml
   ```

3. Update server queries, API types, and UI code.
4. Run the typecheck, tests, and build.
5. Commit the migration together with the code that requires it.

Do not edit an already-applied migration to change its behavior. Add a new migration instead.

## 10. Troubleshooting

### Port `5173` or `8787` is already in use

Stop the existing development command with `Ctrl+C`, then run `npm run dev` again. The Vite configuration expects the UI on `5173` and proxies API requests to `8787`.

### The UI loads but authenticated requests fail

Check all of the following:

- The Worker is running on port `8787`.
- `.dev.vars` exists in the repository root.
- `BETTER_AUTH_SECRET` is present and not the placeholder value.
- The browser is using `http://localhost:5173`, not a different hostname.
- The local database migrations have been applied.

Then sign out, clear the local session if necessary, and sign in again.

### The admin workspace has no restaurant

That is expected on a fresh database. Sign up or sign in, open `/admin`, and create a restaurant. A public fixture menu does not create an authenticated D1 restaurant.

### Superadmin pages show `Forbidden`

Confirm that the signed-in email exactly matches `SUPERADMIN_EMAIL` in `.dev.vars`. Use lowercase for both values, restart the Worker after changing `.dev.vars`, then sign out and sign in again.

### A migration fails

Inspect the local migration state:

```bash
npx wrangler d1 migrations list menusa-production --local --config wrangler.api.toml
```

Do not delete `.wrangler/` as a first troubleshooting step; it removes the local database and session data. If the local database can be recreated safely, stop the dev server, remove `.wrangler/`, restart the Worker, and reapply migrations.

### Email actions do not send email

Email delivery requires both:

- `RESEND_API_KEY` in `.dev.vars`
- A verified sender in `EMAIL_FROM`

Without a Resend key, email calls are intentionally skipped during local development.

## 11. Keeping computers in sync

Commit source changes, migrations, lockfile changes, and documentation to Git. Do not commit:

- `.dev.vars`
- `.env.development`
- `.wrangler/`
- `node_modules/`
- Local database files
- Resend or other production secrets

A new computer needs the repository, its own `.dev.vars`, its own local D1 state, and the current migrations. Local users, sessions, restaurants, and uploaded images are not shared between computers unless you explicitly build a data export/import process.
