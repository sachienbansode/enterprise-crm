#!/bin/bash
# Apply DB scripts to the CRM database using settings from /etc/niytri-crm.env
# (DATABASE_URL + PGPASSWORD — password never appears on the command line).
#
#   bash scripts/db-migrate.sh                       # schema sync (safe to re-run)
#   bash scripts/db-migrate.sh db/05-refresh-lead-dates.sql   # run a specific script
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE=/etc/niytri-crm.env
if [ -z "${DATABASE_URL:-}" ]; then
  set -a; source <(sudo cat "$ENV_FILE"); set +a
fi

FILES=("$@")
[ ${#FILES[@]} -eq 0 ] && FILES=(db/04-schema-sync.sql)

for f in "${FILES[@]}"; do
  echo "→ Applying $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -1 -f "$f"
done
echo "→ DB scripts applied."
