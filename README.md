# fe-siken-quiz-bot

Telegram Bot + Web quiz app for learners preparing for Japan's Fundamental Information Technology Engineer Examination.

Users enter one practice scope in Telegram, receive a `/quiz/{token}` link, answer 20 questions in the browser, and review their result with explanations. The first submitted result is recorded against the Telegram user and later used for weak-topic and wrong-question selection.

## Features

- Telegram Bot entrypoint with `/start`, `/help`, and topic input.
- Web quiz page with 20 questions, answer progress, mobile bottom-sheet navigation, and desktop side navigation.
- Result page with score summary, original question text, all choices, selected answer, correct answer, explanation, and source URL.
- Token-based access without web login.
- First submission only updates user history; repeated visits are read-only.
- Scope selection from configured FE category tree, with OpenAI fallback suggestions when local matching fails.
- SQLite app database managed by Drizzle migrations.
- FE question bank read from `fe_siken_questions.sqlite` or the FE Question
  Bank Service Runtime API.
- Docker Compose deployment with `web`, `bot`, `edge`, and one-shot `migrate` services.
- GitHub Actions builds Docker images in GHCR and deploys them to a VPS over SSH.

## Tech Stack

- Next.js, React, TypeScript
- grammY for Telegram Bot webhook handling
- SQLite + better-sqlite3
- Drizzle ORM + Drizzle Kit
- OpenAI SDK
- Zod for validation
- Vitest, Playwright
- Docker Compose + Nginx

## Project Structure

```text
app/                     Next.js routes and API handlers
src/
  ai/                    OpenAI scope parsing
  bot/                   Telegram bot runtime
  config/                YAML config loading and validation
  db/                    App DB and question DB access
  quiz/                  Quiz selection, submit, and UI logic
config/
  app.yaml               Runtime product/category configuration
drizzle/                 App DB migrations
deploy/
  docker-compose.yml     Production Docker Compose stack
  nginx/                 Internal edge and external VPS Nginx examples
  scripts/               Deploy, init, backup, smoke-test scripts
docs/                    Product, API, architecture, deployment docs
```

## Local Development

Requirements:

- Node.js 22
- pnpm 10
- SQLite question bank file: `fe_siken_questions.sqlite`

Install dependencies:

```bash
pnpm install
```

Create local environment file:

```bash
cp .env.development.example .env
```

Prepare local files:

```text
./fe_siken_questions.sqlite
./config/app.yaml
./data/app.sqlite
```

SQLite remains the default question-bank mode:

```env
QUESTION_BANK_MODE=sqlite
QUESTION_DB_PATH=./fe_siken_questions.sqlite
```

To test against the local FE Question Bank Service Runtime API:

```env
QUESTION_BANK_MODE=http
QUESTION_BANK_SERVICE_URL=http://127.0.0.1:8124
```

Run migrations:

```bash
pnpm db:migrate
```

Start the web app:

```bash
pnpm dev
```

Start the Telegram Bot webhook server in another terminal:

```bash
pnpm bot:start
```

## Telegram Local Debugging

For real Telegram webhook testing, expose the local bot server with a public HTTPS tunnel and set the webhook to:

```text
https://<your-public-url>/telegram/webhook/<TELEGRAM_WEBHOOK_PATH_SECRET>
```

The request must include Telegram's `X-Telegram-Bot-Api-Secret-Token`, configured by `TELEGRAM_WEBHOOK_SECRET_TOKEN`.

Production can set `TELEGRAM_AUTO_SET_WEBHOOK=true` so the bot registers its
webhook on startup with both `message` and `callback_query` updates enabled.

See [deploy/TELEGRAM_WEBHOOK.md](deploy/TELEGRAM_WEBHOOK.md) for webhook commands.

## Environment Files

Use separate templates for development and production:

- `.env.development.example`
- `.env.production.example`

Production `.env` should be placed on the VPS under `/opt/fe-quiz-bot/.env`. Runtime database, config, and assets live outside the Git checkout so deployments can safely run `git reset --hard`.

Question-bank runtime values:

- `QUESTION_BANK_MODE=sqlite` reads `/app/data/fe_siken_questions.sqlite`.
- `QUESTION_BANK_MODE=http` reads `QUESTION_BANK_SERVICE_URL`.
- Roll back from HTTP mode by setting `QUESTION_BANK_MODE=sqlite` and keeping
  `QUESTION_DB_PATH` mounted at `/app/data/fe_siken_questions.sqlite`.

## Testing

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
```

## Docker Deployment

The Docker stack contains:

- `edge`: internal Nginx reverse proxy
- `web`: Next.js web/API service
- `bot`: Telegram webhook service
- `migrate`: one-shot migration service

Validate Compose config:

```bash
docker compose --profile tools -f deploy/docker-compose.yml config
```

Production VPS runtime layout:

```text
/opt/fe-quiz-bot/
  .env
  config/app.yaml
  data/fe_siken_questions.sqlite
  data/app.sqlite
  assets/fe-siken/
  logs/bot.log         Bot JSON log file mirrored from container stdout
  app/                 Git checkout
```

Deployment details are in [docs/deployment-github-actions.md](docs/deployment-github-actions.md).

Bot runtime logs are also written to the VPS host:

```bash
tail -f /opt/fe-quiz-bot/logs/bot.log
```

## GitHub Actions Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`.

Required GitHub repository secrets:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`

Optional secrets:

- `VPS_SSH_PORT`
- `VPS_DEPLOY_ROOT`
- `VPS_DEPLOY_DIR`
- `VPS_REPO_URL`
- `SMOKE_BASE_URL`

The workflow builds and pushes `web`, `bot`, and `migrate` images to GHCR, then SSHs into the VPS, pulls the latest `main`, checks runtime files, pulls those images, runs migrations, restarts services, and runs a smoke test.

## Important Runtime Data

Do not commit these files:

- `.env`
- `fe_siken_questions.sqlite`
- `data/app.sqlite`
- `data/app.sqlite-*`

Question images should be available under:

```text
assets/fe-siken/
```

and served as:

```text
/assets/fe-siken/...
```
