# FE-Test Question Bank Service Migration Guide

## Goal

FE-Test currently reads `fe_siken_questions.sqlite` directly with `better-sqlite3`.
The migration path introduces a `QuestionBankProvider` boundary so runtime code can
switch from the existing SQLite reader to the FE Question Bank Service HTTP API without
changing quiz selection, quiz loading, or answer submission behavior.

The initial implementation keeps production on SQLite by default. HTTP mode should be
enabled only after service health, latency, and quiz behavior have been verified.

## Files Changed

The HTTP Provider adaptation adds these files:

| File | Purpose |
|---|---|
| `src/db/question-bank/provider.ts` | Shared provider interface and detail options. |
| `src/db/question-bank/http-provider.ts` | Runtime API client and DTO mapper. |
| `src/db/question-bank/http-provider.test.ts` | HTTP mock coverage for keywords, candidates, single detail, and batch details. |

Existing SQLite files remain available:

| File | Role |
|---|---|
| `src/db/question-bank/client.ts` | Resolves and opens `QUESTION_DB_PATH` in readonly mode. |
| `src/db/question-bank/queries.ts` | Existing SQLite query implementation. |

## Provider Design

The provider boundary is:

```ts
interface QuestionBankProvider {
  listKeywords(): Promise<QuestionBankKeywords>
  findCandidates(filters?: QuestionCandidateFilters): Promise<QuestionCandidateRow[]>
  getDetailByUrl(url: string, options?: DetailOptions): Promise<QuestionDetail | null>
  getDetailsByUrls(urls: string[], options?: DetailOptions): Promise<QuestionDetail[]>
}
```

`SqliteQuestionBankProvider` should wrap the existing `client.ts` and `queries.ts`
functions when the remaining call sites are migrated. `HttpQuestionBankProvider`
already maps service DTOs back to FE-Test's current domain shape:

- `questionId` -> `id`
- `questionUrl` -> `url` for candidates
- missing `answer` and `explanation` -> `null`
- batch response `items` -> ordered `QuestionDetail[]`

## Environment Variables

Current SQLite mode:

```env
QUESTION_BANK_MODE=sqlite
QUESTION_DB_PATH=./fe_siken_questions.sqlite
```

HTTP mode:

```env
QUESTION_BANK_MODE=http
QUESTION_BANK_SERVICE_URL=http://127.0.0.1:8000
```

Production should keep `QUESTION_BANK_MODE=sqlite` until HTTP mode has completed
the validation checklist below.

## Call Chain Comparison

### Bot Creates A Quiz

Before:

1. `src/bot/main.ts` opens SQLite with `openQuestionBank()`.
2. `listQuestionBankKeywords(questionDb)` loads scope keywords.
3. `src/bot/quiz-session-factory.ts` calls `findQuestionCandidates(questionDb, filters)`.
4. Selected question URLs are stored in `app.sqlite`.

After provider migration:

1. Bot initialization creates `QuestionBankProvider` from `QUESTION_BANK_MODE`.
2. `provider.listKeywords()` loads scope keywords.
3. Quiz session factory calls `provider.findCandidates(filters)`.
4. Selected question URLs are still stored in `app.sqlite`.

### Web Loads An Active Quiz

Before:

1. `src/app/api/quiz/[token]/route.ts` opens SQLite.
2. `src/quiz/quiz-service.ts` calls `getQuestionDetail(questionDb, questionUrl)` for each URL.
3. Active quiz response omits answer, explanation, and source URL.

After provider migration:

1. Route creates or receives `QuestionBankProvider`.
2. `provider.getDetailsByUrls(urls, { includeAnswer: false, includeExplanation: false })`
   loads details in one batch.
3. Active quiz response continues to omit answer, explanation, and source URL.

### Web Submits Answers

Before:

1. `src/app/api/quiz/[token]/submit/route.ts` opens SQLite.
2. `src/quiz/submit-service.ts` calls `getQuestionDetail(...)`.
3. The service validates submitted labels, calculates correctness, writes first-submit
   history, and returns answer/explanation.

After provider migration:

1. Submit route creates or receives `QuestionBankProvider`.
2. `provider.getDetailsByUrls(urls, { includeAnswer: true, includeExplanation: true })`
   loads details in session order.
3. Submit behavior remains unchanged: repeated submit returns the first result and does
   not add answer history.

## Local Verification

Run the HTTP Provider unit test:

```bash
pnpm vitest run src/db/question-bank/http-provider.test.ts
```

Run project checks:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

The quiz route integration tests pin the system time around their fixtures so full
test runs do not drift into expired-token `410` responses as wall-clock time advances.

## Production Cutover

1. Deploy FE Question Bank Service runtime and verify:

```bash
curl -fsS http://127.0.0.1:8000/health
```

2. Run FE-Test with SQLite mode and current production config.
3. Enable HTTP mode in a staging environment:

```env
QUESTION_BANK_MODE=http
QUESTION_BANK_SERVICE_URL=http://question-bank-runtime:8000
```

4. Validate bot quiz creation, web quiz loading, and answer submission.
5. Switch production only after the validation commands pass and service latency is acceptable.

## Rollback

Set:

```env
QUESTION_BANK_MODE=sqlite
QUESTION_DB_PATH=/app/data/fe_siken_questions.sqlite
```

Restart FE-Test web and bot processes. Because quiz sessions continue to store question URLs,
rollback does not require data migration.
