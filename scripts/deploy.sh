#!/bin/bash
# One-command deploy on the server: pull, build, migrate DB, restart.
#   cd /opt/niytri-crm && bash scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

git pull
bash scripts/build-prod.sh
set -a; source <(sudo cat /etc/niytri-crm.env); set +a
bash scripts/db-migrate.sh
pm2 restart niytri-crm --update-env
pm2 save
echo "=== Deploy complete ==="
