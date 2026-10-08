#!/bin/bash
set -e

echo "=== NIYTRI CRM Production Startup ==="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INIT_SQL="$SCRIPT_DIR/db-init.sql"

# ── 1. Database initialisation / sync ─────────────────────────────────────────
echo "→ Checking database state..."

TABLE_EXISTS=$(psql "$DATABASE_URL" -t -c \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='users';" \
  2>/dev/null | tr -d ' \n' || echo "0")

USER_COUNT=$(psql "$DATABASE_URL" -t -c \
  "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' \n' || echo "0")

# Seed if: table missing, data empty, or FORCE_DATA_SYNC env var is set
if [ "$TABLE_EXISTS" = "0" ] || [ "$USER_COUNT" = "0" ] || [ "${FORCE_DATA_SYNC:-0}" = "1" ]; then
  echo "→ Seeding database (tables_exist=$TABLE_EXISTS, users=$USER_COUNT, force=${FORCE_DATA_SYNC:-0})..."
  psql "$DATABASE_URL" < "$INIT_SQL"
  echo "→ Database seeded successfully ($(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users;" | tr -d ' \n') users, $(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM clients;" | tr -d ' \n') clients)."
else
  # Apply only incremental column migrations (safe to run repeatedly)
  echo "→ Database has data — applying incremental migrations..."
  psql "$DATABASE_URL" -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile VARCHAR(20);" 2>/dev/null || true
  psql "$DATABASE_URL" -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(100);" 2>/dev/null || true
  psql "$DATABASE_URL" -c "ALTER TABLE m365_config ADD COLUMN IF NOT EXISTS prefer_smtp BOOLEAN DEFAULT FALSE;" 2>/dev/null || true
  psql "$DATABASE_URL" -c "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_value JSONB;" 2>/dev/null || true
  psql "$DATABASE_URL" -c "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_value JSONB;" 2>/dev/null || true
  psql "$DATABASE_URL" -c "ALTER TABLE documents ADD COLUMN IF NOT EXISTS sr_id UUID;" 2>/dev/null || true
  echo "→ Incremental migrations done."
fi

# ── 2. Start the API server ────────────────────────────────────────────────────
echo "→ Starting API server on port $PORT..."
exec node --enable-source-maps artifacts/api-server/dist/index.mjs
