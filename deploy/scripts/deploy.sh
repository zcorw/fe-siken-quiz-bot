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

log "starting deployment"
log "deploy root=${DEPLOY_ROOT}"
log "project dir=${PROJECT_DIR}"
log "branch=${BRANCH}"
log "compose file=${COMPOSE_FILE}"
log "env file=${ENV_FILE}"
log "config dir=${HOST_CONFIG_DIR}"
log "data dir=${HOST_DATA_DIR}"
log "assets dir=${HOST_ASSETS_DIR}"
log "deploy dir=${HOST_DEPLOY_DIR}"

if [ ! -d "${PROJECT_DIR}/.git" ]; then
  if [ -z "${REPO_URL}" ]; then
    echo "PROJECT_DIR is not a git checkout and REPO_URL is not set." >&2
    exit 1
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

export HOST_ENV_FILE="${ENV_FILE}"
export HOST_CONFIG_DIR
export HOST_DATA_DIR
export HOST_ASSETS_DIR
export HOST_DEPLOY_DIR

log "loading env file"
set -a
. "${ENV_FILE}"
set +a
log "env file loaded"

run_step "build migrate service" docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" build migrate
run_step "run app database migrations" docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" run --rm migrate
run_step "build and start app services" docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d --build edge web bot

log "running smoke test with BASE_URL=${SMOKE_BASE_URL}"
BASE_URL="${SMOKE_BASE_URL}" run_step "deployment smoke test" sh ./deploy/scripts/smoke-test.sh

run_step "show compose status" docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" ps
