#!/bin/bash
set -e

echo "=== NIYTRI CRM Production Build ==="

# The lockfile and build settings are for pnpm 10. Newer pnpm (11/12) refuses the build
# (ERR_PNPM_IGNORED_BUILDS), so always run pnpm 10 even if the server has another version.
PNPM_VERSION=10.34.6
if pnpm -v 2>/dev/null | grep -q '^10\.'; then PNPM="pnpm"; else PNPM="npx -y pnpm@$PNPM_VERSION"; fi
echo "→ Using pnpm $($PNPM -v)"

# ── 1. Install dependencies ────────────────────────────────────────────────────
echo "→ Installing dependencies..."
$PNPM install --frozen-lockfile

# ── 2. Build CRM (React/Vite) ─────────────────────────────────────────────────
echo "→ Building CRM frontend..."
export BASE_PATH=/crm/
export PORT=8080
export NODE_ENV=production
$PNPM --filter @workspace/crm run build
echo "→ CRM built to artifacts/crm/dist/public"

# ── 3. Build API server ────────────────────────────────────────────────────────
echo "→ Building API server..."
$PNPM --filter @workspace/api-server run build
echo "→ API server built to artifacts/api-server/dist"

echo "=== Build complete ==="
