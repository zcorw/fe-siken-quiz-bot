# FE Question Database and Asset Cache

This document describes the local SQLite database structure and how scraped
question images are mapped to repository assets.

## Files

- SQLite database in this repository: `fe_siken_questions.sqlite`
- Production SQLite database path: `/opt/fe-quiz-bot/data/fe_siken_questions.sqlite`
- Question image cache in this repository: `docs/assets/fe-siken/`
- Production image cache path: `/opt/fe-quiz-bot/assets/fe-siken/`
- Scraper scripts are not part of the current MVP runtime. If scraper tooling is restored later, keep it outside the web/bot request path.

## Tables

### `source_pages`

Stores source exam-list pages from the offline scraped question index.

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER PRIMARY KEY | Internal row id |
| `label` | TEXT | Source page label, for example `平成31年春期` |
| `url` | TEXT UNIQUE | Source page URL |
| `scraped_at` | TEXT | UTC timestamp when the index was scraped |

### `questions`

Stores the question index. This table contains metadata only, not the full
question body.

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER PRIMARY KEY | Internal row id |
| `source_page_label` | TEXT | Source page label |
| `source_page_url` | TEXT | Source page URL |
| `exam_part` | TEXT | `科目A` or `科目B` |
| `question_no` | TEXT | Question number, for example `問8` or `問A1` |
| `topic` | TEXT | Topic shown in the source index |
| `category` | TEXT | Classification shown in the source index |
| `url` | TEXT UNIQUE | Question detail page URL |
| `scraped_at` | TEXT | UTC timestamp when the index was scraped |

### `question_details`

Stores full question details fetched from each question page. Daily study pages
should read actual question content from this table instead of inventing content
from `topic` or `category`.

| Column | Type | Description |
|---|---|---|
| `question_url` | TEXT PRIMARY KEY | Question detail page URL; joins to `questions.url` |
| `question_text` | TEXT | Plain/Markdown question body. Image references use local `public_path` when cached |
| `question_html` | TEXT | Original HTML fragment for the question body |
| `choices_json` | TEXT | JSON object of choices keyed by `ア`, `イ`, `ウ`, `エ`, optionally `オ` |
| `choices_html_json` | TEXT | JSON object of original HTML fragments for choices |
| `answer` | TEXT | Correct answer label |
| `explanation` | TEXT | Plain/Markdown explanation. Image references use local `public_path` when cached |
| `explanation_html` | TEXT | Original HTML fragment for the explanation |
| `images_json` | TEXT | JSON array mirroring image asset metadata |
| `has_images` | INTEGER | `1` if the question, choices, or explanation contains images |
| `fetched_at` | TEXT | UTC timestamp when detail content was fetched |

### `question_assets`

Stores a normalized record for every scraped image.

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER PRIMARY KEY | Internal row id |
| `question_url` | TEXT | Question detail page URL; joins to `question_details.question_url` |
| `section` | TEXT | Where the image appeared: `question`, `choice`, or `explanation` |
| `choice_label` | TEXT | Choice label if the image belongs to a specific choice; otherwise empty |
| `asset_type` | TEXT | Currently `image` |
| `url` | TEXT | Original remote image URL |
| `local_path` | TEXT | Repository path to the cached image |
| `public_path` | TEXT | Public path used in Markdown/GitHub Pages |
| `alt` | TEXT | Original image alt text |
| `width` | TEXT | Original width attribute |
| `height` | TEXT | Original height attribute |
| `order_index` | INTEGER | Image order within the parsed fragment |
| `fetched_at` | TEXT | UTC timestamp when the asset was recorded |

## Asset Path Mapping

When the detail scraper sees an `<img>` tag, it downloads the image and records
both the original URL and local paths.

Path format:

```text
docs/assets/fe-siken/<exam_slug>/<question_slug>/<filename>
```

Public Markdown path:

```text
/assets/fe-siken/<exam_slug>/<question_slug>/<filename>
```

Example for `https://www.fe-siken.com/kakomon/29_haru/q8.html`:

| Field | Value |
|---|---|
| `question_assets.url` | `https://www.fe-siken.com/kakomon/29_haru/img/08.png` |
| `question_assets.local_path` | `docs/assets/fe-siken/29_haru/q8/08.png` |
| `question_assets.public_path` | `/assets/fe-siken/29_haru/q8/08.png` |

The corresponding `question_details.question_text` contains:

```md
![08.png/image-size:389x98](/assets/fe-siken/29_haru/q8/08.png)
```

## Choice Images

Some pages render all choices as one image and only provide choice buttons in
HTML. For those pages:

- `question_assets.section` is `choice`.
- `choices_json` stores labels such as `ア`, `イ`, `ウ`, `エ`.
- The first choice text includes the cached choice image Markdown so the daily
  page can show the options image once.

Example shape:

```json
{
  "ア": "選択肢画像を参照（ア）\n![03.png/image-size:235x146](/assets/fe-siken/31_haru/q3/03.png)",
  "イ": "選択肢画像を参照（イ）",
  "ウ": "選択肢画像を参照（ウ）",
  "エ": "選択肢画像を参照（エ）"
}
```

## Daily Page Generation Rules

When generating daily study content:

1. Select candidates from `questions`.
2. Use `question_details` for question text, choices, correct answer, and explanation.
3. Include `questions.url` as `来源URL` for every database-backed question.
4. Prefer local cached image paths already embedded in `question_text`,
   `choices_json`, and `explanation`.
5. If image metadata is needed, read `question_assets.public_path`.
6. Do not hotlink `question_assets.url` unless the local cache is missing.

## Useful Queries

Find one question with all image mappings:

```sql
SELECT
  section,
  choice_label,
  url AS remote_url,
  local_path,
  public_path,
  alt,
  width,
  height
FROM question_assets
WHERE question_url = 'https://www.fe-siken.com/kakomon/29_haru/q8.html'
ORDER BY section, order_index;
```

Check 科目A detail coverage:

```sql
SELECT
  COUNT(*) AS total,
  SUM(CASE WHEN d.question_url IS NOT NULL THEN 1 ELSE 0 END) AS cached,
  SUM(CASE WHEN d.question_url IS NULL THEN 1 ELSE 0 END) AS missing
FROM questions q
LEFT JOIN question_details d ON d.question_url = q.url
WHERE q.exam_part = '科目A';
```

Find cached image rows with missing local paths:

```sql
SELECT question_url, section, url, local_path, public_path
FROM question_assets
WHERE local_path = '' OR public_path = '';
```
