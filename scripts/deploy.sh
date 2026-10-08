#!/bin/bash
# One-command deploy on the server: update code, build, migrate DB, restart.
#   cd /opt/niytri-crm && bash scripts/deploy.sh
# Wrapped in a function so bash reads the whole script before running it
# (the git reset below may replace this very file).
main() {
  set -euo pipefail
  cd "$(dirname "$0")/.."

  # The server is deploy-only: always match GitHub exactly. Tool-generated edits on the server
  # (e.g. pnpm rewriting pnpm-workspace.yaml) would otherwise block "git pull".
  # Untracked files (uploads/) and /etc/niytri-crm.env are not touched.
  git fetch origin main
  git reset --hard origin/main

  bash scripts/build-prod.sh
  set -a; source <(sudo cat /etc/niytri-crm.env); set +a
  bash scripts/db-migrate.sh
  pm2 restart niytri-crm --update-env
  pm2 save
  echo "=== Deploy complete ==="
}
main "$@"
