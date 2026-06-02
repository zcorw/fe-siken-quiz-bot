#!/usr/bin/env sh
set -eu

BASE_URL="${BASE_URL:-http://127.0.0.1:3100}"
SMOKE_RETRIES="${SMOKE_RETRIES:-30}"
SMOKE_RETRY_DELAY_SECONDS="${SMOKE_RETRY_DELAY_SECONDS:-2}"
TELEGRAM_WEBHOOK_PATH_SECRET="${TELEGRAM_WEBHOOK_PATH_SECRET:-}"

if [ -z "${TELEGRAM_WEBHOOK_PATH_SECRET}" ]; then
  echo "TELEGRAM_WEBHOOK_PATH_SECRET is required for webhook smoke test." >&2
  exit 1
fi

retry() {
  label="$1"
  shift
  attempt=1

  while [ "${attempt}" -le "${SMOKE_RETRIES}" ]; do
    if "$@"; then
      return 0
    fi

    echo "${label} failed on attempt ${attempt}/${SMOKE_RETRIES}; retrying in ${SMOKE_RETRY_DELAY_SECONDS}s..." >&2
    attempt=$((attempt + 1))
    sleep "${SMOKE_RETRY_DELAY_SECONDS}"
  done

  echo "${label} failed after ${SMOKE_RETRIES} attempts." >&2
  return 1
}

check_quiz_route() {
  curl -fsS "${BASE_URL}/quiz/invalid-token" >/dev/null
}

check_webhook_rejects_invalid_secret() {
  STATUS="$(
    curl -sS -o /dev/null -w "%{http_code}" \
      -X POST "${BASE_URL}/telegram/webhook/${TELEGRAM_WEBHOOK_PATH_SECRET}" \
      -H "content-type: application/json" \
      -H "x-telegram-bot-api-secret-token: wrong-secret" \
      -d '{"update_id":1}'
  )"

  if [ "${STATUS}" != "403" ]; then
    echo "Expected webhook invalid header check to return 403, got ${STATUS}." >&2
    return 1
  fi
}

echo "Checking quiz page route..."
retry "Quiz page route check" check_quiz_route

echo "Checking webhook rejects invalid header secret..."
retry "Webhook invalid-secret check" check_webhook_rejects_invalid_secret

echo "Smoke test passed."
