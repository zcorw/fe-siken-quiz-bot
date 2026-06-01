#!/usr/bin/env sh
set -eu

DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/fe-quiz-bot}"
PROJECT_DIR="${PROJECT_DIR:-${DEPLOY_ROOT}/app}"
ENV_FILE="${ENV_FILE:-${DEPLOY_ROOT}/.env}"
HOST_CONFIG_DIR="${HOST_CONFIG_DIR:-${DEPLOY_ROOT}/config}"
HOST_DATA_DIR="${HOST_DATA_DIR:-${DEPLOY_ROOT}/data}"
HOST_ASSETS_DIR="${HOST_ASSETS_DIR:-${DEPLOY_ROOT}/assets}"

cd "${PROJECT_DIR}"

mkdir -p "${HOST_DATA_DIR}" "${HOST_ASSETS_DIR}" "${DEPLOY_ROOT}/backups" "${HOST_CONFIG_DIR}"

missing=""

require_file() {
  if [ ! -f "$1" ]; then
    missing="${missing}\n- $1"
  fi
}

require_file "${ENV_FILE}"
require_file "${HOST_CONFIG_DIR}/app.yaml"
require_file "${HOST_DATA_DIR}/fe_siken_questions.sqlite"

if [ ! -d "${HOST_ASSETS_DIR}/fe-siken" ]; then
  missing="${missing}\n- ${HOST_ASSETS_DIR}/fe-siken/"
fi

if [ -n "${missing}" ]; then
  printf "Missing required runtime files:%b\n" "${missing}" >&2
  printf "\nPlace these files on the VPS before deployment and rerun the workflow.\n" >&2
  exit 1
fi

if [ ! -f "${HOST_DATA_DIR}/app.sqlite" ]; then
  touch "${HOST_DATA_DIR}/app.sqlite"
fi

echo "Runtime files are present."
