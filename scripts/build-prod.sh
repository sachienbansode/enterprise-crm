#!/bin/bash
set -e

echo "=== NIYTRI CRM Production Build ==="

# ── 1. Install dependencies ────────────────────────────────────────────────────
echo "→ Installing dependencies..."
pnpm install --frozen-lockfile

# ── 2. Build CRM (React/Vite) ─────────────────────────────────────────────────
echo "→ Building CRM frontend..."
export BASE_PATH=/crm/
export PORT=8080
export NODE_ENV=production
pnpm --filter @workspace/crm run build
echo "→ CRM built to artifacts/crm/dist/public"

# ── 3. Build API server ────────────────────────────────────────────────────────
echo "→ Building API server..."
pnpm --filter @workspace/api-server run build
echo "→ API server built to artifacts/api-server/dist"

echo "=== Build complete ==="
