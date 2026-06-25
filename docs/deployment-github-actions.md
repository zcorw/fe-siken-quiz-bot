# GitHub Actions VPS Auto Deployment

This project can deploy automatically after code is pushed to `main`.

GitHub Actions SSHs into the VPS and runs the deployment script. The VPS fetches the latest code and builds the application Docker images locally with Docker Compose before running them.

GitHub Actions does not upload runtime secrets, config, or database files. The VPS must already contain those files under the deployment root.

## VPS Directory

Default path:

```text
/opt/fe-quiz-bot/app/
  # Git checkout. Do not put production runtime files here.

/opt/fe-quiz-bot/
  .env
  config/
    app.yaml
  data/
    fe_siken_questions.sqlite
    app.sqlite              # created by deployment if missing
  logs/
    bot.log               # created by the bot container
```

`app.sqlite` is initialized by Drizzle migrations when it does not already exist.

The code checkout and runtime files are intentionally separate. Deployment runs `git reset --hard` inside `/opt/fe-quiz-bot/app`, so production `.env`, `config`, `data`, and `logs` must live outside that checkout.
Question image assets now live in FE Question Bank Service, not under the FE-Test deployment root.

## VPS Requirements

Install these on the VPS:

- Git
- Docker Engine
- Docker Compose plugin
- Enough CPU, memory, and disk space to build the Next.js, Bot, and migration images locally
- External Nginx and Certbot, managed outside Docker

The repository checkout must be writable by the SSH deploy user.

## GitHub Secrets

Required repository secrets:

| Secret | Purpose |
|---|---|
| `VPS_HOST` | VPS hostname or IP |
| `VPS_USER` | SSH user |
| `VPS_SSH_KEY` | Private SSH key for deployment |

Optional repository secrets:

| Secret | Default | Purpose |
|---|---|---|
| `VPS_SSH_PORT` | `22` | SSH port |
| `VPS_DEPLOY_ROOT` | `/opt/fe-quiz-bot` | Runtime root and parent of the repository checkout |
| `VPS_DEPLOY_DIR` | `/opt/fe-quiz-bot/app` | Repository checkout directory |
| `VPS_REPO_URL` | `git@github.com:<owner>/<repo>.git` | Git URL used by the VPS to clone/fetch code |
| `SMOKE_BASE_URL` | `http://127.0.0.1:3100` | URL used by deployment smoke test |

If the repository is private, add a GitHub deploy key to the repository and install the matching private key for the VPS deploy user, or set `VPS_REPO_URL` to a URL that the VPS can access.

## Runtime `.env`

Place `.env` on the VPS. Minimum production values:

Use `.env.production.example` as the starting template.

```env
PUBLIC_BASE_URL=https://example.com
OPENAI_API_KEY=replace-me
TELEGRAM_BOT_TOKEN=replace-me
TELEGRAM_WEBHOOK_PATH_SECRET=replace-me
TELEGRAM_WEBHOOK_SECRET_TOKEN=replace-me
TELEGRAM_WEBHOOK_HEADER_SECRET=replace-me
TELEGRAM_AUTO_SET_WEBHOOK=true
EDGE_HOST=127.0.0.1
EDGE_PORT=3100
QUESTION_BANK_MODE=sqlite
# QUESTION_BANK_SERVICE_URL=http://question-bank-runtime:8000
```

The Docker Compose file sets container paths for `APP_CONFIG_PATH`, `APP_DB_PATH`, and `QUESTION_DB_PATH`.

### Question Bank Runtime Cutover

Default and rollback mode:

```env
QUESTION_BANK_MODE=sqlite
QUESTION_DB_PATH=/app/data/fe_siken_questions.sqlite
```

Staging HTTP mode:

```env
QUESTION_BANK_MODE=http
QUESTION_BANK_SERVICE_URL=http://127.0.0.1:8124
```

Production HTTP mode should point at the separately deployed FE Question Bank
Service Runtime API from inside the Docker network or from the VPS host:

```env
QUESTION_BANK_MODE=http
QUESTION_BANK_SERVICE_URL=http://question-bank-runtime:8000
```

When FE-Test runs in Docker Compose, `web` and `bot` join the external
`fe-shared` Docker network and should use
`QUESTION_BANK_SERVICE_URL=http://question-bank-runtime:8000`. Create that
network once on each VPS before deploying either project:

```sh
docker network inspect fe-shared >/dev/null 2>&1 || docker network create fe-shared
```

Before production cutover, verify the service health endpoint:

```sh
curl -fsS "$QUESTION_BANK_SERVICE_URL/health"
```

Then run the opt-in HTTP flow smoke test from the app checkout:

```sh
RUN_QUESTION_BANK_HTTP_SMOKE=1 \
QUESTION_BANK_SERVICE_URL="$QUESTION_BANK_SERVICE_URL" \
pnpm vitest run src/quiz/http-mode-smoke.integration.test.ts
```

Rollback does not require an app database migration. Set
`QUESTION_BANK_MODE=sqlite`, ensure `data/fe_siken_questions.sqlite` is mounted,
and redeploy or restart `web` and `bot`.

When `TELEGRAM_AUTO_SET_WEBHOOK=true`, the bot registers Telegram webhook on
startup with `message` and `callback_query` updates enabled. This keeps inline
scope selection buttons functional after deployment.

The deployment script normalizes `.env` line endings before loading it, so files uploaded from Windows with CRLF line endings are accepted.

The deploy script exports these host paths for Docker Compose:

```env
HOST_ENV_FILE=/opt/fe-quiz-bot/.env
HOST_CONFIG_DIR=/opt/fe-quiz-bot/config
HOST_DATA_DIR=/opt/fe-quiz-bot/data
HOST_LOG_DIR=/opt/fe-quiz-bot/logs
```

Question images are no longer mounted into FE-Test. Browser requests to
`/assets/fe-siken/...` are handled by the web container and proxied to
`QUESTION_BANK_SERVICE_URL`, normally `http://question-bank-runtime:8000` on the
shared Docker network. Store and back up question images in the question bank
service deployment instead.

The bot container writes JSON logs to both Docker stdout and the host file:

```sh
tail -f /opt/fe-quiz-bot/logs/bot.log
```

## First Deployment

1. Create `/opt/fe-quiz-bot/`.
2. Put `.env`, `config/app.yaml`, and `data/fe_siken_questions.sqlite` under `/opt/fe-quiz-bot/`.
3. Configure external VPS Nginx using `deploy/nginx/vps-external.example.conf`.
4. Add the GitHub secrets.
5. Push to `main`, or run the workflow manually.

The workflow SSHs into the VPS and runs:

```sh
deploy/scripts/deploy.sh
```

That script:

1. Clones the repository if needed.
2. Fetches and resets to `origin/main`.
3. Checks required runtime files.
4. Builds the `web`, `bot`, and `migrate` images locally on the VPS.
5. Runs Drizzle migrations through the one-shot `migrate` Compose service.
6. Restarts `edge`, `web`, and `bot`.
7. Runs the deployment smoke test.

## Updating Code

Push to `main`.

GitHub Actions will SSH into the VPS. The VPS will fetch the latest code, build images locally, run migrations, restart services, and run smoke checks.

Runtime files are preserved because they live outside the Git checkout and are mounted into Docker containers.
