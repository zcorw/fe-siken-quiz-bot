# fe_siken_questions.sqlite Runtime Usage

## Purpose

`fe_siken_questions.sqlite` is the read-only fallback question bank used by FE-Test.
The application never writes learner data, tokens, answers, or statistics to this
database. Those records are stored in `app.sqlite`.

The SQLite question bank provides:

- question candidate metadata
- question text
- choices
- correct answers
- explanations
- source URLs
- image metadata and image references
- distinct `category` and `topic` keywords

The database schema and asset conventions are described in
[database-and-assets.md](./database-and-assets.md).

## Runtime Mode

SQLite mode is selected with:

```env
QUESTION_BANK_MODE=sqlite
QUESTION_DB_PATH=./fe_siken_questions.sqlite
```

In production containers, `QUESTION_DB_PATH` normally points to:

```env
QUESTION_DB_PATH=/app/data/fe_siken_questions.sqlite
```

On the VPS host, the file is expected at:

```text
/opt/fe-quiz-bot/data/fe_siken_questions.sqlite
```

`deploy/docker-compose.yml` mounts `${HOST_DATA_DIR:-../data}` to `/app/data`.

## Code Boundary

SQLite access is wrapped behind the same provider interface used by HTTP mode:

```text
src/db/question-bank/provider.ts
src/db/question-bank/provider-factory.ts
src/db/question-bank/sqlite-provider.ts
```

When `QUESTION_BANK_MODE=sqlite`, `createQuestionBankProvider()` creates a
`SqliteQuestionBankProvider`, which delegates to:

```text
src/db/question-bank/client.ts
src/db/question-bank/queries.ts
```

`client.ts` opens the file with `better-sqlite3` using:

- `fileMustExist: true`
- `readonly: true`

## Query Operations

### `listKeywords()`

Reads distinct `category` and `topic` values from the `questions` table.

Used by:

- Bot startup
- local scope matching
- OpenAI fallback prompt context

Return shape:

```ts
{
  categories: string[];
  topics: string[];
}
```

### `findCandidates(filters)`

Reads candidate rows from `questions`.

Fixed condition:

```sql
exam_part = '科目A'
```

Supported filters:

- `category`
- `categories`
- `topic`
- `url`

The result contains metadata only. It does not include answers or explanations.

### `getDetailByUrl(url, options)`

Reads one question detail by `question_url`.

When the active quiz is loaded before submission, answer and explanation are not
returned to the frontend DTO. When the submitted result is loaded, the service
uses the same detail record to include:

- original question
- all choices
- user answer
- correct answer
- explanation
- source URL

### `getDetailsByUrls(urls, options)`

Loads details for the session question URLs and returns them in session order.
This is used by quiz loading and answer submission services.

## Runtime Call Flow

### Bot Quiz Creation

1. `src/bot/main.ts` creates a question-bank provider.
2. `provider.listKeywords()` loads categories and topics.
3. User text is matched to a major or minor category.
4. `src/bot/quiz-session-factory.ts` calls `provider.findCandidates(...)`.
5. The selected 20 question URLs are stored in `app.sqlite`.

The question bank is not mutated during this flow.

### Web Quiz Loading

1. `GET /api/quiz/{token}` opens `app.sqlite`.
2. The route creates a question-bank provider.
3. The quiz service reads the 20 stored question URLs from `app.sqlite`.
4. `provider.getDetailsByUrls(...)` loads text, choices, images, and source
   metadata.
5. Before submission, the frontend response omits correct answers,
   explanations, and source URLs.

### Answer Submission

1. `POST /api/quiz/{token}/submit` opens `app.sqlite`.
2. The route creates a question-bank provider.
3. The submit service loads the 20 question details.
4. Submitted labels are validated against the choices from the question bank.
5. Correctness is calculated from the question-bank answer.
6. Only the first submission writes learner history to `app.sqlite`.

## Image Handling

SQLite records can contain image references in:

- `question_details.question_text`
- `question_details.choices_json`
- `question_details.explanation`
- `question_details.images_json`

FE-Test renders image paths through `/assets/fe-siken/...`. In HTTP question-bank
mode, that route proxies to the FE Question Bank Service. In SQLite fallback
mode, deployments must keep compatible image paths available if image rendering
is required.

## Error Cases

| Scenario | Source | Result |
|---|---|---|
| `QUESTION_DB_PATH` is missing | `resolveQuestionBankPath` | startup or request failure |
| database file is missing | `openQuestionBank` | startup or request failure |
| SQLite open fails | `openQuestionBank` | wrapped path-specific error |
| session question detail is missing | quiz or submit service | quiz load or submit failure |
| invalid `choices_json` | `getQuestionDetail` | request failure |
| invalid submitted choice label | submit service | `INVALID_ANSWER` response |

## Responsibility Boundary

`fe_siken_questions.sqlite` is responsible for question-bank content only.

It does not store:

- Telegram users
- quiz tokens
- selected session state
- submitted answers
- wrong-answer history
- random selection seed
- learner statistics

Those records belong to `app.sqlite`.
