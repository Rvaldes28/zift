#!/usr/bin/env bash
# Arranca MinIO local para desarrollo (storage S3-compatible para media propia).
#
#   API:     http://localhost:9000
#   Console: http://localhost:9001
#
# Uso:
#   # desde /
#   ./infra/scripts/start-minio.sh
#
# Credenciales locales por defecto: minioadmin / minioadmin (solo desarrollo).
set -euo pipefail

DATA_DIR="${MINIO_DATA_DIR:-$HOME/minio-data}"
mkdir -p "$DATA_DIR"

MINIO_ROOT_USER="${MINIO_ROOT_USER:-minioadmin}" \
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-minioadmin}" \
exec minio server "$DATA_DIR" --address ":9000" --console-address ":9001"
