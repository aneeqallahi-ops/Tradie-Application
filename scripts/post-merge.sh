#!/bin/bash
set -e

pnpm install --prefer-frozen-lockfile
pnpm --filter @workspace/db run push --force || pnpm --filter @workspace/db run push-force || true
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/api-server run build
