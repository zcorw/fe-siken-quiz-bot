#!/usr/bin/env sh
set -eu

DATA_DIR="${DATA_DIR:-/opt/fe-quiz-bot/data}"
CONFIG_DIR="${CONFIG_DIR:-/opt/fe-quiz-bot/config}"
BACKUP_DIR="${BACKUP_DIR:-/opt/fe-quiz-bot/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

APP_DB_PATH="${APP_DB_PATH:-${DATA_DIR}/app.sqlite}"
APP_CONFIG_PATH="${APP_CONFIG_PATH:-${CONFIG_DIR}/app.yaml}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST_DIR="${BACKUP_DIR}/${STAMP}"

mkdir -p "${DEST_DIR}"

if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "${APP_DB_PATH}" ".backup '${DEST_DIR}/app.sqlite'"
else
  cp "${APP_DB_PATH}" "${DEST_DIR}/app.sqlite"
  if [ -f "${APP_DB_PATH}-wal" ]; then
    cp "${APP_DB_PATH}-wal" "${DEST_DIR}/app.sqlite-wal"
  fi
  if [ -f "${APP_DB_PATH}-shm" ]; then
    cp "${APP_DB_PATH}-shm" "${DEST_DIR}/app.sqlite-shm"
  fi
fi

cp "${APP_CONFIG_PATH}" "${DEST_DIR}/app.yaml"

find "${BACKUP_DIR}" -mindepth 1 -maxdepth 1 -type d -mtime "+${RETENTION_DAYS}" -exec rm -rf {} \;

echo "Backup written to ${DEST_DIR}"
