#!/usr/bin/env bash
# Crea (idempotente) el bucket local de MinIO para la media de Payload.
#
# Requiere MinIO corriendo:   ./infra/scripts/start-minio.sh
# Requiere el cliente mc:     brew install minio-mc
#
# Uso:
#   # desde /
#   ./infra/scripts/create-minio-bucket.sh
set -euo pipefail

MINIO_ALIAS="ziftlocal"
MINIO_URL="${S3_ENDPOINT:-http://localhost:9000}"
MINIO_USER="${MINIO_ROOT_USER:-minioadmin}"
MINIO_PASSWORD="${MINIO_ROOT_PASSWORD:-minioadmin}"
BUCKET="${S3_BUCKET:-payload-media}"

if ! command -v mc >/dev/null 2>&1; then
  echo "Error: 'mc' no está instalado. Instalar con: brew install minio-mc" >&2
  exit 1
fi

mc alias set "$MINIO_ALIAS" "$MINIO_URL" "$MINIO_USER" "$MINIO_PASSWORD"
mc mb --ignore-existing "$MINIO_ALIAS/$BUCKET"
echo "Bucket '$BUCKET' listo en $MINIO_URL"
