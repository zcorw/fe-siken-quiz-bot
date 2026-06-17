# Question Bank Service Interface

## Purpose

FE-Test can read question-bank data in two modes:

- `sqlite`: read `fe_siken_questions.sqlite` directly.
- `http`: read the separately deployed FE Question Bank Service Runtime API.

The HTTP mode is used when FE-Test should not mount or query the question-bank
SQLite file directly. The application-level behavior remains the same in both
modes: Bot quiz creation, web quiz loading, and answer submission all use the
same `QuestionBankProvider` boundary.

## Configuration

```env
QUESTION_BANK_MODE=http
QUESTION_BANK_SERVICE_URL=http://question-bank-runtime:8000
```

Development example:

```env
QUESTION_BANK_MODE=http
QUESTION_BANK_SERVICE_URL=http://127.0.0.1:8124
```

Rollback to local SQLite:

```env
QUESTION_BANK_MODE=sqlite
QUESTION_DB_PATH=/app/data/fe_siken_questions.sqlite
```

The factory that selects the mode is:

```text
src/db/question-bank/provider-factory.ts
```

## Provider Contract

FE-Test runtime code depends on:

```ts
interface QuestionBankProvider {
  close?(): void;
  listKeywords(): Promise<QuestionBankKeywords>;
  findCandidates(filters?: QuestionCandidateFilters): Promise<QuestionCandidateRow[]>;
  getDetailByUrl(url: string, options?: DetailOptions): Promise<QuestionDetail | null>;
  getDetailsByUrls(urls: string[], options?: DetailOptions): Promise<QuestionDetail[]>;
}
```

The HTTP implementation is:

```text
src/db/question-bank/http-provider.ts
```

The SQLite implementation is:

```text
src/db/question-bank/sqlite-provider.ts
```

## HTTP Calls Used By FE-Test

### Health Check

Used by deployment smoke checks when HTTP mode is enabled.

```http
GET /health
```

Expected result: `2xx`.

### Keyword List

Used by Bot startup and scope parsing.

```http
GET /keywords
```

Expected response:

```ts
{
  categories: string[];
  topics: string[];
}
```

### Candidate Questions

Used when the Bot creates a quiz session.

```http
GET /questions/candidates?category={category}&topic={topic}&url={url}
```

Query parameters are optional. FE-Test may pass one of these filters depending
on the matched scope:

- `category`
- `topic`
- `url`

Expected response is an array of candidate metadata:

```ts
{
  questionId: number;
  sourcePageLabel: string | null;
  sourcePageUrl: string | null;
  examPart: "科目A";
  questionNo: string | null;
  topic: string | null;
  category: string | null;
  questionUrl: string;
  scrapedAt: string | null;
}[]
```

FE-Test maps `questionId` to internal `id` and `questionUrl` to internal `url`.

### Single Question Detail

Used by provider-level consumers that need one question by URL.

```http
GET /questions/by-url?url={encodedQuestionUrl}&includeAnswer=false&includeExplanation=false
```

`includeAnswer` and `includeExplanation` are optional booleans. Before quiz
submission, FE-Test requests or exposes no answer/explanation data. After
submission, it can request both.

`404` is mapped to `null`.

### Batch Question Details

Used by quiz page loading and submit validation.

```http
POST /questions/details/batch
content-type: application/json
```

Request body:

```ts
{
  urls: string[];
  includeAnswer: boolean;
  includeExplanation: boolean;
}
```

Expected response:

```ts
{
  items: {
    questionUrl: string;
    sourceUrl: string;
    questionText: string | null;
    choices: { label: string; text: string }[];
    answer?: string | null;
    explanation?: string | null;
    hasImages: boolean;
    images: {
      section?: string | null;
      choiceLabel?: string | null;
      url?: string | null;
      localPath?: string | null;
      publicPath?: string | null;
      alt?: string | null;
      width?: string | null;
      height?: string | null;
      orderIndex?: number | null;
    }[];
    fetchedAt: string | null;
  }[];
}
```

FE-Test expects the service to return enough detail for rendering original
questions, all choices, images, explanations, and source URLs on the result
page.

## Asset Proxy

Browser requests for question images use FE-Test paths:

```text
/assets/fe-siken/...
```

The Next.js route below proxies those requests to `QUESTION_BANK_SERVICE_URL`:

```text
src/app/assets/fe-siken/[...path]/route.ts
```

Example:

```text
GET /assets/fe-siken/r07/q28.png
```

is proxied to:

```text
{QUESTION_BANK_SERVICE_URL}/assets/fe-siken/r07/q28.png
```

## Runtime Flow

### Bot Creates A Quiz

1. Bot startup calls `createQuestionBankProvider()`.
2. `provider.listKeywords()` loads categories and topics.
3. Scope matching selects a major or minor category.
4. `provider.findCandidates(...)` returns candidate question URLs.
5. FE-Test applies learner history weighting and randomized selection.
6. The selected URLs are stored in `app.sqlite`.

### Web Loads A Quiz

1. `GET /api/quiz/{token}` loads the token and selected URLs from `app.sqlite`.
2. `provider.getDetailsByUrls(urls, { includeAnswer: false, includeExplanation: false })`
   loads renderable question details.
3. The frontend response omits answers, explanations, and source URLs before
   submission.

### Web Submits Answers

1. `POST /api/quiz/{token}/submit` loads the selected URLs from `app.sqlite`.
2. `provider.getDetailsByUrls(urls, { includeAnswer: true, includeExplanation: true })`
   loads answer and explanation data.
3. FE-Test validates the submitted labels, calculates correctness, and writes
   first-submit history to `app.sqlite`.
4. Repeat submissions only return the existing result.

## Error Handling

| Scenario | FE-Test behavior |
|---|---|
| `QUESTION_BANK_SERVICE_URL` missing in HTTP mode | startup/request configuration error |
| non-2xx service response | provider throws `Question bank request failed with status ...` |
| `/questions/by-url` returns `404` | mapped to `null` |
| batch detail misses a session question | quiz load or submit fails |
| asset proxy target missing | browser image request returns upstream failure |

## Deployment Notes

When using Docker Compose with an external FE Question Bank Service, both stacks
must share a Docker network where `QUESTION_BANK_SERVICE_URL` resolves, for
example:

```env
QUESTION_BANK_SERVICE_URL=http://question-bank-runtime:8000
```

Deployment details are documented in
[deployment-github-actions.md](./deployment-github-actions.md). The SQLite
fallback behavior is documented in
[QUESTION_DB_RUNTIME_USAGE.md](./QUESTION_DB_RUNTIME_USAGE.md).
