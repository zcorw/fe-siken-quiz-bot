#!/usr/bin/env sh
set -eu

DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/fe-quiz-bot}"
PROJECT_DIR="${PROJECT_DIR:-${DEPLOY_ROOT}/app}"
ENV_FILE="${ENV_FILE:-${DEPLOY_ROOT}/.env}"
HOST_CONFIG_DIR="${HOST_CONFIG_DIR:-${DEPLOY_ROOT}/config}"
HOST_DATA_DIR="${HOST_DATA_DIR:-${DEPLOY_ROOT}/data}"
HOST_ASSETS_DIR="${HOST_ASSETS_DIR:-${DEPLOY_ROOT}/assets}"
HOST_LOG_DIR="${HOST_LOG_DIR:-${DEPLOY_ROOT}/logs}"
HOST_DEPLOY_DIR="${HOST_DEPLOY_DIR:-${PROJECT_DIR}/deploy}"
BRANCH="${BRANCH:-main}"
REPO_URL="${REPO_URL:-}"
COMPOSE_FILE="${COMPOSE_FILE:-deploy/docker-compose.yml}"
SMOKE_BASE_URL="${SMOKE_BASE_URL:-http://127.0.0.1:${EDGE_PORT:-3100}}"
APP_RUN_UID="${APP_RUN_UID:-$(id -u)}"
APP_RUN_GID="${APP_RUN_GID:-$(id -g)}"
IMAGE_REGISTRY="${IMAGE_REGISTRY:-ghcr.io}"
IMAGE_REPOSITORY="${IMAGE_REPOSITORY:-zcorw/fe-siken-quiz-bot}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
WEB_IMAGE="${WEB_IMAGE:-${IMAGE_REGISTRY}/${IMAGE_REPOSITORY}/web:${IMAGE_TAG}}"
BOT_IMAGE="${BOT_IMAGE:-${IMAGE_REGISTRY}/${IMAGE_REPOSITORY}/bot:${IMAGE_TAG}}"
MIGRATE_IMAGE="${MIGRATE_IMAGE:-${IMAGE_REGISTRY}/${IMAGE_REPOSITORY}/migrate:${IMAGE_TAG}}"

log() {
  printf '[deploy.sh] %s\n' "$*"
}

run_step() {
  name="$1"
  shift
  log "start: ${name}"
  "$@"
  log "done: ${name}"
}

normalize_env_file() {
  source_file="$1"
  target_file="$2"
  # Strip CR from CRLF uploads so POSIX sh and docker compose read the same values.
  tr -d '\r' < "${source_file}" > "${target_file}"
}

log "starting deployment"
log "deploy root=${DEPLOY_ROOT}"
log "project dir=${PROJECT_DIR}"
log "branch=${BRANCH}"
log "compose file=${COMPOSE_FILE}"
log "env file=${ENV_FILE}"
log "config dir=${HOST_CONFIG_DIR}"
log "data dir=${HOST_DATA_DIR}"
log "assets dir=${HOST_ASSETS_DIR}"
log "log dir=${HOST_LOG_DIR}"
log "deploy dir=${HOST_DEPLOY_DIR}"
log "app run uid/gid=${APP_RUN_UID}:${APP_RUN_GID}"
log "web image=${WEB_IMAGE}"
log "bot image=${BOT_IMAGE}"
log "migrate image=${MIGRATE_IMAGE}"

if [ ! -d "${PROJECT_DIR}/.git" ]; then
  if [ -z "${REPO_URL}" ]; then
    echo "PROJECT_DIR is not a git checkout and REPO_URL is not set." >&2
    exit 1
  fi
  if [ -e "${PROJECT_DIR}" ]; then
    if [ -n "$(find "${PROJECT_DIR}" -mindepth 1 -maxdepth 1 -print -quit)" ]; then
      echo "PROJECT_DIR exists but is not an empty directory or git checkout: ${PROJECT_DIR}" >&2
      echo "Move it away or remove it before first automated deployment." >&2
      exit 1
    fi
    log "project dir exists and is empty; cloning into it"
  fi
  log "git checkout not found; cloning repository"
  run_step "create project parent directory" mkdir -p "$(dirname "${PROJECT_DIR}")"
  run_step "clone repository" git clone --branch "${BRANCH}" "${REPO_URL}" "${PROJECT_DIR}"
fi

run_step "enter project directory" cd "${PROJECT_DIR}"

run_step "show git status before update" git status --short --branch
run_step "fetch branch" git fetch origin "${BRANCH}"
run_step "reset to origin branch" git reset --hard "origin/${BRANCH}"

run_step "check runtime files" sh ./deploy/scripts/init-runtime.sh

NORMALIZED_ENV_FILE="$(mktemp)"
trap 'rm -f "${NORMALIZED_ENV_FILE}"' EXIT
run_step "normalize env file line endings" normalize_env_file "${ENV_FILE}" "${NORMALIZED_ENV_FILE}"

export HOST_ENV_FILE="${NORMALIZED_ENV_FILE}"
export HOST_CONFIG_DIR
export HOST_DATA_DIR
export HOST_ASSETS_DIR
export HOST_LOG_DIR
export HOST_DEPLOY_DIR
export APP_RUN_UID
export APP_RUN_GID
export WEB_IMAGE
export BOT_IMAGE
export MIGRATE_IMAGE

log "loading env file"
set -a
. "${NORMALIZED_ENV_FILE}"
set +a
log "env file loaded"

run_step "pull app images" docker compose --env-file "${NORMALIZED_ENV_FILE}" -f "${COMPOSE_FILE}" --profile tools pull edge web bot migrate
run_step "run app database migrations" docker compose --env-file "${NORMALIZED_ENV_FILE}" -f "${COMPOSE_FILE}" --profile tools run --rm migrate
run_step "start app services" docker compose --env-file "${NORMALIZED_ENV_FILE}" -f "${COMPOSE_FILE}" up -d edge web bot

log "running smoke test with BASE_URL=${SMOKE_BASE_URL}"
if ! BASE_URL="${SMOKE_BASE_URL}" run_step "deployment smoke test" sh ./deploy/scripts/smoke-test.sh; then
  log "smoke test failed; showing compose status and recent logs"
  docker compose --env-file "${NORMALIZED_ENV_FILE}" -f "${COMPOSE_FILE}" ps || true
  docker compose --env-file "${NORMALIZED_ENV_FILE}" -f "${COMPOSE_FILE}" logs --tail=120 edge web bot || true
  exit 1
fi

run_step "show compose status" docker compose --env-file "${NORMALIZED_ENV_FILE}" -f "${COMPOSE_FILE}" ps
