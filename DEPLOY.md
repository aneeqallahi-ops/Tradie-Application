# Deploying TradeLedger off Replit (no-login mode)

This app runs as **one persistent Node service**: the Express API server
(`artifacts/api-server`) serves the built React SPA *and* handles `/api/*`.
Build with `pnpm run build`, run with `pnpm run start`. It needs a PostgreSQL
database via `DATABASE_URL`. That's the whole runtime.

Authentication can be switched off with a single env var (`AUTH_DISABLED=true`),
which turns the app into a single-tenant, no-login app — every request is the
same fixed user. The original OIDC/Replit login code is left intact and is
restored just by unsetting the flag. See `.env.example`.

> ⚠️ With `AUTH_DISABLED=true` there is **no access control in the app** — anyone
> who can reach the URL sees and edits the same shared account. Fine for personal
> / single-tenant use. If it shouldn't be open, gate it at the platform level
> (Cloudflare Access, Railway access controls, or HTTP basic auth at a proxy).

---

## Railway (recommended — what you already use)

1. **Add Postgres**: New → Database → PostgreSQL. Railway exposes `DATABASE_URL`
   to the service automatically (reference it in the service's variables).
2. **Service settings**
   - Build command: `pnpm run build`
   - Start command: `pnpm run start`
   - Railway injects `PORT` — the server reads it (`artifacts/api-server/src/index.ts`).
3. **Environment variables**
   - `NODE_ENV=production`
   - `AUTH_DISABLED=true`
   - `DATABASE_URL` → reference the Postgres plugin's variable
   - (optional) `LOCAL_USER_*` overrides from `.env.example`
4. **Push the DB schema** (once). Either run locally pointed at the prod DB, or
   as a Railway one-off command:
   ```
   cd lib/db && pnpm run push
   ```
5. Deploy. Open the generated domain — the app loads straight into the dashboard,
   no login.

## Render (alternative)

A `render.yaml` is included — create a new Blueprint from the repo and Render
provisions the web service + Postgres and wires `DATABASE_URL` automatically.
Set `AUTH_DISABLED=true` in the service env. Run `cd lib/db && pnpm run push`
once via the Render shell.

## Fly.io / VPS (alternative)

Same model: `pnpm install && pnpm run build`, then `pnpm run start` with
`DATABASE_URL`, `NODE_ENV=production`, `AUTH_DISABLED=true`, and a `PORT` the
process listens on (8080 by default).

---

## Local note (Windows)

`pnpm-workspace.yaml` deliberately strips all non-Linux-x64 native binaries
(esbuild/rollup/tailwind) for Replit. A local `pnpm install` will therefore fail
on Windows/macOS. The deploy hosts above are all Linux-x64, so cloud builds are
unaffected. For local dev on Windows, remove those `"-"` platform overrides first.
