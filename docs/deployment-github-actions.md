# GitHub Actions VPS Auto Deployment

This project can deploy automatically after code is pushed to `main`.

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
  assets/
    fe-siken/
```

`app.sqlite` is initialized by Drizzle migrations when it does not already exist.

The code checkout and runtime files are intentionally separate. Deployment runs `git reset --hard` inside `/opt/fe-quiz-bot/app`, so production `.env`, `config`, `data`, and `assets` must live outside that checkout.

## VPS Requirements

Install these on the VPS:

- Git
- Docker Engine
- Docker Compose plugin
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
EDGE_HOST=127.0.0.1
EDGE_PORT=3100
```

The Docker Compose file sets container paths for `APP_CONFIG_PATH`, `APP_DB_PATH`, and `QUESTION_DB_PATH`.

The deployment script normalizes `.env` line endings before loading it, so files uploaded from Windows with CRLF line endings are accepted.

The deploy script exports these host paths for Docker Compose:

```env
HOST_ENV_FILE=/opt/fe-quiz-bot/.env
HOST_CONFIG_DIR=/opt/fe-quiz-bot/config
HOST_DATA_DIR=/opt/fe-quiz-bot/data
HOST_ASSETS_DIR=/opt/fe-quiz-bot/assets
```

## First Deployment

1. Create `/opt/fe-quiz-bot/`.
2. Put `.env`, `config/app.yaml`, `data/fe_siken_questions.sqlite`, and `assets/fe-siken/` under `/opt/fe-quiz-bot/`.
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
4. Runs Drizzle migrations through the one-shot `migrate` Compose service.
5. Rebuilds and restarts `edge`, `web`, and `bot`.
6. Runs the deployment smoke test.

## Updating Code

Push to `main`.

GitHub Actions will pull the latest code on the VPS, rebuild containers, run migrations, restart services, and run smoke checks.

Runtime files are preserved because they live outside the Git checkout and are mounted into Docker containers.
