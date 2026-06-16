# Single-service build for Railway. We control the toolchain explicitly because
# the auto-builders (Nixpacks/Railpack) guess pnpm 9 from the lockfile version,
# but this repo's pnpm-workspace.yaml uses pnpm-10 features (`catalog:`
# specifiers and top-level `overrides`). pnpm 9 fails the frozen install with
# ERR_PNPM_LOCKFILE_CONFIG_MISMATCH.
FROM node:24

# pnpm 10 (latest) — understands `catalog:` and workspace-yaml `overrides`.
RUN npm install -g pnpm@10

WORKDIR /app

# Copy the whole workspace (monorepo: the root build orchestrates all packages).
COPY . .

# --no-frozen-lockfile lets pnpm reconcile the lockfile at build time, so we are
# not blocked by minor lockfile/config drift between pnpm versions.
RUN pnpm install --no-frozen-lockfile

# Builds the frontend (Vite) and the API server (esbuild) per the root script.
RUN pnpm run build

ENV NODE_ENV=production

# Railway injects PORT at runtime; the server reads it. startCommand in
# railway.json also points here.
CMD ["pnpm", "run", "start"]
