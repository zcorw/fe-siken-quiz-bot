#!/usr/bin/env sh
set -eu

DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/fe-quiz-bot}"
PROJECT_DIR="${PROJECT_DIR:-${DEPLOY_ROOT}/app}"
ENV_FILE="${ENV_FILE:-${DEPLOY_ROOT}/.env}"
HOST_CONFIG_DIR="${HOST_CONFIG_DIR:-${DEPLOY_ROOT}/config}"
HOST_DATA_DIR="${HOST_DATA_DIR:-${DEPLOY_ROOT}/data}"
HOST_ASSETS_DIR="${HOST_ASSETS_DIR:-${DEPLOY_ROOT}/assets}"
HOST_DEPLOY_DIR="${HOST_DEPLOY_DIR:-${PROJECT_DIR}/deploy}"
BRANCH="${BRANCH:-main}"
REPO_URL="${REPO_URL:-}"
COMPOSE_FILE="${COMPOSE_FILE:-deploy/docker-compose.yml}"
SMOKE_BASE_URL="${SMOKE_BASE_URL:-http://127.0.0.1:${EDGE_PORT:-3100}}"

if [ ! -d "${PROJECT_DIR}/.git" ]; then
  if [ -z "${REPO_URL}" ]; then
    echo "PROJECT_DIR is not a git checkout and REPO_URL is not set." >&2
    exit 1
  fi
  mkdir -p "$(dirname "${PROJECT_DIR}")"
  git clone --branch "${BRANCH}" "${REPO_URL}" "${PROJECT_DIR}"
fi

cd "${PROJECT_DIR}"

git fetch origin "${BRANCH}"
git reset --hard "origin/${BRANCH}"

sh ./deploy/scripts/init-runtime.sh

export HOST_ENV_FILE="${ENV_FILE}"
export HOST_CONFIG_DIR
export HOST_DATA_DIR
export HOST_ASSETS_DIR
export HOST_DEPLOY_DIR

set -a
. "${ENV_FILE}"
set +a

docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" build migrate
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" run --rm migrate
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d --build edge web bot

BASE_URL="${SMOKE_BASE_URL}" sh ./deploy/scripts/smoke-test.sh

docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" ps
