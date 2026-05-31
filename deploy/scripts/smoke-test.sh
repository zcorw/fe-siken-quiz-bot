#!/usr/bin/env sh
set -eu

BASE_URL="${BASE_URL:-http://127.0.0.1:3100}"
TELEGRAM_WEBHOOK_PATH_SECRET="${TELEGRAM_WEBHOOK_PATH_SECRET:-}"

if [ -z "${TELEGRAM_WEBHOOK_PATH_SECRET}" ]; then
  echo "TELEGRAM_WEBHOOK_PATH_SECRET is required for webhook smoke test." >&2
  exit 1
fi

echo "Checking quiz page route..."
curl -fsS "${BASE_URL}/quiz/invalid-token" >/dev/null

echo "Checking webhook rejects invalid header secret..."
STATUS="$(
  curl -sS -o /dev/null -w "%{http_code}" \
    -X POST "${BASE_URL}/telegram/webhook/${TELEGRAM_WEBHOOK_PATH_SECRET}" \
    -H "content-type: application/json" \
    -H "x-telegram-bot-api-secret-token: wrong-secret" \
    -d '{"update_id":1}'
)"

if [ "${STATUS}" != "403" ]; then
  echo "Expected webhook invalid header check to return 403, got ${STATUS}." >&2
  exit 1
fi

echo "Smoke test passed."
