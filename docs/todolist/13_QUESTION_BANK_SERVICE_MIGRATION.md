# 13 Question Bank Service Migration TodoList

## Project Summary

FE-Test currently keeps the user/session/answer history in `app.sqlite` and reads
the FE question bank from `fe_siken_questions.sqlite`. The migration goal is to
make question-bank reads go through the FE Question Bank Service Runtime API while
preserving the current Telegram Bot -> quiz token -> Web quiz -> submit flow.

The local service runtime has been verified on:

```text
http://127.0.0.1:8124/health -> {"ok":true,"database":"ready","readOnly":true}
```

## Source Documents Reviewed

- `docs/FE_TEST_MIGRATION_GUIDE.md`: target provider boundary, env vars, call
  chain comparison, production cutover, rollback.
- `docs/QUESTION_DB_RUNTIME_USAGE.md`: current direct SQLite query usage and
  runtime call chains.
- `docs/database-and-assets.md`: old SQLite schema and asset assumptions.
- `docs/todolist/*.md`: existing implementation status and validation style.
- `D:/Workspace/AI/FE-QuestionBank-Service/docs/CURRENT_PROJECT_MIGRATION_GUIDE.md`:
  Runtime API, Admin API, fallback, validation, and operations expectations.

## Key Requirements

- Runtime question-bank reads must support both SQLite and HTTP modes during
  migration.
- `QUESTION_BANK_MODE=sqlite` remains the default until HTTP mode is verified.
- `QUESTION_BANK_MODE=http` uses `QUESTION_BANK_SERVICE_URL`.
- Quiz sessions must continue storing question URLs, not remote service IDs.
- Active quiz responses must not expose answer, explanation, or source URL.
- Submitted quiz responses must include answer and explanation exactly as before.
- Rollback to SQLite must not require app database migration.

## Questions / Assumptions

- The FE Question Bank Service is deployed separately and reachable by FE-Test
  web and bot containers.
- HTTP mode should fail closed for user-facing quiz loading/submission if the
  service is unavailable.
- Static question images still need a serving strategy. The Runtime API returns
  question content and image paths, but FE-Test must still be able to serve or
  proxy `/assets/fe-siken/...` paths.
- Admin API is not used by FE-Test runtime.

## Development TodoList

- [x] T001 [P0] Add provider factory and runtime config
  Goal: FE-Test can construct either SQLite or HTTP `QuestionBankProvider` from
  environment variables.
  Notes: Add a small factory around `QUESTION_BANK_MODE`, `QUESTION_DB_PATH`, and
  `QUESTION_BANK_SERVICE_URL`. Keep SQLite as default. Validate missing
  `QUESTION_BANK_SERVICE_URL` only in HTTP mode.
  Likely files/modules: `src/db/question-bank/provider.ts`,
  `src/db/question-bank/http-provider.ts`, `src/db/question-bank/client.ts`,
  `src/config/*`, tests near config/provider modules.
  Depends on: None.
  Verify: Unit tests cover sqlite default, http mode, missing service URL, and
  unsupported mode.

- [x] T002 [P0] Wrap current SQLite queries in a provider implementation
  Goal: Existing SQLite behavior is available through the same provider
  interface as HTTP mode.
  Notes: Implement `SqliteQuestionBankProvider` by delegating to
  `listQuestionBankKeywords`, `findQuestionCandidates`, `getQuestionDetail`, and
  a batch helper that preserves input URL order.
  Likely files/modules: `src/db/question-bank/sqlite-provider.ts`,
  `src/db/question-bank/queries.ts`, `src/db/question-bank/provider.ts`.
  Depends on: T001.
  Verify: Tests assert SQLite provider returns the same shapes as existing query
  tests.

- [ ] T003 [P0] Migrate bot startup keyword loading to provider
  Goal: Bot initialization no longer imports or opens the question SQLite file
  directly.
  Notes: Replace `openQuestionBank()` + `listQuestionBankKeywords(questionDb)`
  in bot startup with the provider factory and `provider.listKeywords()`. Ensure
  lifecycle cleanup still closes SQLite connections in SQLite mode.
  Likely files/modules: `src/bot/main.ts`, `src/bot/runtime-env.ts`,
  `src/db/question-bank/*`.
  Depends on: T001, T002.
  Verify: Bot startup tests pass in SQLite mode and HTTP mode with a mocked
  provider/service response.

- [ ] T004 [P0] Migrate quiz session creation to provider candidates
  Goal: Telegram-created quizzes select candidates through
  `QuestionBankProvider.findCandidates`.
  Notes: Refactor `quiz-session-factory` so selection logic consumes provider
  methods instead of a `better-sqlite3` database handle. Preserve category,
  topic, randomization, sibling fallback, and selection seed behavior.
  Likely files/modules: `src/bot/quiz-session-factory.ts`,
  `src/quiz/question-selection.ts`, related tests.
  Depends on: T003.
  Verify: Existing quiz session factory tests pass; add HTTP/provider mock tests
  for category and topic selection.

- [ ] T005 [P0] Migrate active quiz loading to provider batch details
  Goal: `GET /api/quiz/[token]` loads question details through the provider and
  avoids N per-question single lookups.
  Notes: Use `provider.getDetailsByUrls(urls, { includeAnswer: false,
  includeExplanation: false })`. Preserve token expiry, submitted-state behavior,
  response DTOs, and hidden answer/explanation/source URL behavior.
  Likely files/modules: `src/app/api/quiz/[token]/route.ts`,
  `src/quiz/quiz-service.ts`, route tests.
  Depends on: T001, T002.
  Verify: Route unit/integration tests pass; add an assertion that active quiz
  details can come from an HTTP provider mock.

- [ ] T006 [P0] Migrate quiz submission to provider batch details
  Goal: `POST /api/quiz/[token]/submit` grades answers using provider-loaded
  details.
  Notes: Use `provider.getDetailsByUrls(urls, { includeAnswer: true,
  includeExplanation: true })` in session order. Preserve first-submit locking,
  repeated-submit idempotence, answer history writes, and result DTO shape.
  Likely files/modules: `src/app/api/quiz/[token]/submit/route.ts`,
  `src/quiz/submit-service.ts`, submit route tests.
  Depends on: T005.
  Verify: Submit unit/integration tests pass in SQLite mode and provider mock
  mode.

- [ ] T007 [P1] Add HTTP mode integration smoke test against local service
  Goal: FE-Test can create/load/submit at least one quiz while using
  `QUESTION_BANK_MODE=http`.
  Notes: Use the locally running FE Question Bank Service, for example
  `QUESTION_BANK_SERVICE_URL=http://127.0.0.1:8124`. Keep the test opt-in if it
  depends on an external service process.
  Likely files/modules: `tests`, `src/bot/*.integration.test.ts`,
  `src/app/api/quiz/**/*.integration.test.ts`.
  Depends on: T004, T005, T006.
  Verify: Documented command proves bot selection, active quiz loading, and
  submit flow work against `http://127.0.0.1:8124`.

- [ ] T008 [P1] Document runtime environment and rollback
  Goal: Operators know how to deploy HTTP mode and return to SQLite mode.
  Notes: Update env examples and deployment docs with `QUESTION_BANK_MODE=http`,
  `QUESTION_BANK_SERVICE_URL`, SQLite rollback values, and service health check.
  Likely files/modules: `.env.example`, deployment docs, README.
  Depends on: T007.
  Verify: Docs include staging cutover, production cutover, and rollback steps.

- [ ] T009 [P1] Verify asset path behavior in HTTP mode
  Goal: Quiz pages still render question images after question details come from
  the service.
  Notes: Identify whether FE-Test will serve existing static assets, mount the
  question-bank asset directory, or proxy service asset paths. Add tests for at
  least one image-backed question.
  Likely files/modules: `src/quiz/components/QuestionContent.tsx`,
  Next static asset config, Docker/deploy files.
  Depends on: T005.
  Verify: Playwright or component test renders an image-backed question without
  broken image URLs.

- [ ] T010 [P1] Run full regression and cutover checklist
  Goal: HTTP mode is ready for staging or production.
  Notes: Run all standard checks and a manual health/cutover checklist.
  Likely files/modules: N/A.
  Depends on: T001-T009.
  Verify: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`, service
  `/health`, bot quiz creation, quiz load, quiz submit, and SQLite rollback all
  pass.

## Acceptance Criteria

- FE-Test runs in SQLite mode with no behavior regression.
- FE-Test runs in HTTP mode using the FE Question Bank Service Runtime API.
- Bot quiz creation, active quiz loading, and answer submission behave the same
  in both modes.
- The app can roll back to SQLite mode by environment variable change only.
- Full project validation passes: `pnpm typecheck`, `pnpm lint`, `pnpm test`,
  and `pnpm test:e2e`.

## Suggested Execution Order

1. Foundation: T001, T002.
2. Bot and selection flow: T003, T004.
3. Web quiz runtime flow: T005, T006.
4. Integration and assets: T007, T009.
5. Operations and release: T008, T010.
