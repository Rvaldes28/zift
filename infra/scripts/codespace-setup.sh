#!/usr/bin/env bash
# Prepare database, storage, and the development admin user in Codespaces.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required. In Codespaces this is installed by the devcontainer." >&2
  exit 1
fi

bash infra/scripts/codespace-env.sh

wait_for_tcp() {
  local host="$1"
  local port="$2"
  local label="$3"

  echo "Waiting for $label..."
  for _ in $(seq 1 60); do
    if timeout 1 bash -c "cat < /dev/null > /dev/tcp/$host/$port" 2>/dev/null; then
      echo "$label is ready."
      return 0
    fi
    sleep 2
  done

  echo "$label did not become ready." >&2
  return 1
}

wait_for_http() {
  local url="$1"
  local label="$2"

  echo "Waiting for $label..."
  for _ in $(seq 1 60); do
    if curl -sfo /dev/null "$url"; then
      echo "$label is ready."
      return 0
    fi
    sleep 2
  done

  echo "$label did not become ready." >&2
  return 1
}

wait_for_tcp postgres 5432 PostgreSQL
wait_for_http http://minio:9000/minio/health/live MinIO

pnpm db:migrate
pnpm db:seed
pnpm --filter @ziftlab/db build

ADMIN_DEV_EMAIL="${ADMIN_DEV_EMAIL:-admin@ziftlab.codespace}" \
ADMIN_DEV_NAME="${ADMIN_DEV_NAME:-Admin Codespace}" \
ADMIN_DEV_PASSWORD="${ADMIN_DEV_PASSWORD:-ZiftLabCodespace1234}" \
pnpm --filter admin dev:user

echo ""
echo "Codespace setup complete."
echo "Run pnpm codespace:dev to start the dashboard and web app."
