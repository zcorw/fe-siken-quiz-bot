# Project Documentation Map

This file lists where to find the main project documentation and what each file
covers.

## Project Purpose And Product Scope

| Document | Covers |
|---|---|
| [README.md](../README.md) | Short project summary, features, tech stack, local development, deployment entry points. |
| [PRD.md](./PRD.md) | Product background, target users, MVP scope, business rules, roles and permissions. |
| [USER_FLOW.md](./USER_FLOW.md) | Telegram entry flow, quiz flow, result flow, edge cases, error flows. |
| [PAGE_LIST.md](./PAGE_LIST.md) | Web page list, page purpose, main components, states, and data dependencies. |

## Architecture And Data

| Document | Covers |
|---|---|
| [TECH_ARCHITECTURE.md](./TECH_ARCHITECTURE.md) | Frontend, backend, database, authentication, deployment, and directory structure decisions. |
| [DATA_MODEL.md](./DATA_MODEL.md) | Main business entities, fields, relationships, and constraints for `app.sqlite`. |
| [API_SPEC.md](./API_SPEC.md) | Web and Bot-facing API endpoints, requests, responses, and error handling. |
| [database-and-assets.md](./database-and-assets.md) | Question-bank database schema and question image asset rules. |

## Question Bank Integration

| Document | Covers |
|---|---|
| [QUESTION_DB_RUNTIME_USAGE.md](./QUESTION_DB_RUNTIME_USAGE.md) | Direct `fe_siken_questions.sqlite` runtime usage, read-only behavior, query operations, and error cases. |
| [QUESTION_BANK_SERVICE_INTERFACE.md](./QUESTION_BANK_SERVICE_INTERFACE.md) | FE-Test to FE Question Bank Service HTTP interface, provider contract, endpoints, asset proxy, and runtime flows. |
| [FE_TEST_MIGRATION_GUIDE.md](./FE_TEST_MIGRATION_GUIDE.md) | Migration path from direct SQLite reads to the FE Question Bank Service provider boundary. |

## Deployment And Operations

| Document | Covers |
|---|---|
| [deployment-github-actions.md](./deployment-github-actions.md) | GitHub Actions image build, GHCR push, VPS pull-and-run deployment, runtime files, smoke tests, rollback. |
| [../deploy/TELEGRAM_WEBHOOK.md](../deploy/TELEGRAM_WEBHOOK.md) | Telegram webhook registration and local/prod webhook checks. |
| [../deploy/nginx/vps-external.example.conf](../deploy/nginx/vps-external.example.conf) | External VPS Nginx reverse proxy example. |
| [../.env.development.example](../.env.development.example) | Local development environment variables. |
| [../.env.production.example](../.env.production.example) | Production environment variables expected on the VPS. |

## Development Task Lists

| Document | Covers |
|---|---|
| [todolist/00_PROJECT_OVERVIEW.md](./todolist/00_PROJECT_OVERVIEW.md) | Implementation roadmap overview. |
| [todolist/13_QUESTION_BANK_SERVICE_MIGRATION.md](./todolist/13_QUESTION_BANK_SERVICE_MIGRATION.md) | Question-bank service migration implementation tasks. |

## Current Coverage Check

- Project purpose: covered by `README.md` and `PRD.md`.
- Product flows and page behavior: covered by `USER_FLOW.md` and `PAGE_LIST.md`.
- App API behavior: covered by `API_SPEC.md`.
- Direct SQLite question-bank usage: covered by `QUESTION_DB_RUNTIME_USAGE.md`.
- FE Question Bank Service HTTP integration: covered by `QUESTION_BANK_SERVICE_INTERFACE.md`.
- Deployment: covered by `README.md`, `deployment-github-actions.md`, and files under `deploy/`.
