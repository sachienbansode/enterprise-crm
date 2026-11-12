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
# Build into a new folder and swap only when the build succeeds — a failed build never takes the live app down
CRM_DIST="artifacts/crm/dist"
rm -rf "$CRM_DIST/public.next"
CRM_OUT_DIR="$(pwd)/$CRM_DIST/public.next" $PNPM --filter @workspace/crm run build
if [ ! -f "$CRM_DIST/public.next/index.html" ]; then echo "✗ CRM build produced no index.html — keeping the current app"; exit 1; fi
rm -rf "$CRM_DIST/public.prev"
[ -d "$CRM_DIST/public" ] && mv "$CRM_DIST/public" "$CRM_DIST/public.prev"
mv "$CRM_DIST/public.next" "$CRM_DIST/public"
rm -rf "$CRM_DIST/public.prev"
echo "→ CRM built to artifacts/crm/dist/public"

# ── 3. Build API server ────────────────────────────────────────────────────────
echo "→ Building API server..."
SKIP_CRM_BUILD=1 $PNPM --filter @workspace/api-server run build
echo "→ API server built to artifacts/api-server/dist"

echo "=== Build complete ==="
