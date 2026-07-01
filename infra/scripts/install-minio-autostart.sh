#!/usr/bin/env bash
# Instala (idempotente) un LaunchAgent de macOS para que MinIO arranque solo
# al iniciar sesión y se reinicie si se cae (igual que hace brew services con
# PostgreSQL, pero conservando los puertos 9000/9001 y el data dir del proyecto).
#
# No usamos `brew services start minio` porque su definición de servicio no fija
# el puerto 9001 de la consola ni usa nuestro data dir (~/minio-data).
#
# El plist generado es autocontenido (invoca el binario de minio directamente):
# launchd no puede ejecutar scripts dentro de carpetas protegidas por TCC como
# ~/Downloads, así que no debe depender de la ubicación del repo.
#
# Uso:
#   # desde /
#   ./infra/scripts/install-minio-autostart.sh
#
# Desinstalar:
#   launchctl bootout "gui/$(id -u)/com.ziftlab.minio"
#   rm ~/Library/LaunchAgents/com.ziftlab.minio.plist
set -euo pipefail

LABEL="com.ziftlab.minio"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/ziftlab-minio.log"
DATA_DIR="${MINIO_DATA_DIR:-$HOME/minio-data}"
MINIO_USER="${MINIO_ROOT_USER:-minioadmin}"
MINIO_PASSWORD="${MINIO_ROOT_PASSWORD:-minioadmin}"

# Preferir la ruta estable de Homebrew (sobrevive a `brew upgrade minio`)
if BREW_PREFIX="$(brew --prefix minio 2>/dev/null)" && [ -x "$BREW_PREFIX/bin/minio" ]; then
  MINIO_BIN="$BREW_PREFIX/bin/minio"
else
  MINIO_BIN="$(command -v minio || true)"
fi
if [ -z "$MINIO_BIN" ]; then
  echo "Error: 'minio' no está instalado. Instalar con: brew install minio" >&2
  exit 1
fi

mkdir -p "$DATA_DIR" "$HOME/Library/LaunchAgents"

cat > "$PLIST" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$MINIO_BIN</string>
    <string>server</string>
    <string>$DATA_DIR</string>
    <string>--address</string>
    <string>:9000</string>
    <string>--console-address</string>
    <string>:9001</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>MINIO_ROOT_USER</key>
    <string>$MINIO_USER</string>
    <key>MINIO_ROOT_PASSWORD</key>
    <string>$MINIO_PASSWORD</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$LOG</string>
  <key>StandardErrorPath</key>
  <string>$LOG</string>
</dict>
</plist>
PLIST_EOF

# Recargar si ya estaba instalado. Tras bootout, launchd tarda un instante en
# liberar el label: esperar y reintentar el bootstrap.
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
for i in 1 2 3 4 5; do
  if launchctl bootstrap "gui/$(id -u)" "$PLIST" 2>/dev/null; then
    break
  fi
  if [ "$i" = 5 ]; then
    echo "Error: no se pudo cargar el LaunchAgent tras 5 intentos." >&2
    exit 1
  fi
  sleep 2
done

echo "LaunchAgent '$LABEL' instalado y arrancado."
echo "  Binario: $MINIO_BIN"
echo "  Data:    $DATA_DIR"
echo "  API:     http://localhost:9000"
echo "  Console: http://localhost:9001"
echo "  Log:     $LOG"
