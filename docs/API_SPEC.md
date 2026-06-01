# API_SPEC: Bot 与 Web API 规范

## 1. 设计原则

- Telegram Bot 使用 webhook。
- Web 测试页面通过 token 访问。
- token 首次提交后锁定。
- Web API 不要求用户登录。
- token 与 Telegram 用户在创建时绑定。
- 重复提交不更新历史。

## 2. Telegram webhook

### `POST /telegram/webhook/{pathSecret}`

容器：`bot`

用途：接收 Telegram update。

处理：

1. 校验 URL path 中的 `pathSecret`。
2. 校验请求头 `X-Telegram-Bot-Api-Secret-Token`。
3. 任一校验失败时返回 403 或 404，不处理 update。
4. 解析 Telegram update。
5. 创建或更新本地用户。
6. 读取用户消息文本。
7. 处理 `/start` 或 `/help`。
8. 普通文本按练习主题处理。
9. 解析练习范围：优先匹配 `topics.category_tree` 大分类 / 小分类和别名。
10. 若本地无匹配，AI 只能从现有大分类 / 小分类中推荐候选。
11. 若有 AI 候选，发送 Telegram inline buttons，等待用户点击候选。
12. 用户点击候选按钮后，按该候选分类创建 session/token。
13. 若匹配成功，创建 session/token。
14. 发送 Web 测试链接按钮。

成功响应：

```json
{
  "ok": true
}
```

错误响应：

```json
{
  "ok": false
}
```

对用户的 Telegram 文案使用日文。第一版只支持 `/start` 和 `/help` 命令。

## 3. Web API

### `GET /api/quiz/{token}`

容器：`web`

用途：加载测试页面数据或已提交结果。

响应：未提交

```json
{
  "status": "active",
  "token": "token",
  "totalQuestions": 20,
  "questions": [
    {
      "index": 1,
      "questionUrl": "https://www.fe-siken.com/kakomon/29_haru/q8.html",
      "questionText": "Markdown question text",
      "choices": [
        { "label": "ア", "text": "10" },
        { "label": "イ", "text": "50" },
        { "label": "ウ", "text": "70" },
        { "label": "エ", "text": "100" }
      ],
      "hasImages": true
    }
  ]
}
```

未提交状态不返回：

- 正确答案
- 解析
- 来源 URL 展示字段

响应：已提交

```json
{
  "status": "submitted",
  "token": "token",
  "summary": {
    "totalQuestions": 20,
    "correctCount": 15,
    "incorrectCount": 5,
    "accuracy": 0.75
  },
  "selectionSummary": {
    "requestedScopeCount": 15,
    "reinforcementCount": 5,
    "requestedMajorCategory": "ネットワーク",
    "requestedMinorCategories": ["通信プロトコル"],
    "primaryMinorCategory": "通信プロトコル",
    "siblingMinorCategoriesUsed": [],
    "wrongQuestionCount": 2,
    "weakTopicCount": 2,
    "highWeightTopicCount": 1
  },
  "questions": [
    {
      "index": 1,
      "questionUrl": "https://www.fe-siken.com/kakomon/29_haru/q8.html",
      "questionText": "Markdown question text",
      "choices": [
        { "label": "ア", "text": "10" }
      ],
      "selectedAnswer": "エ",
      "correctAnswer": "エ",
      "isCorrect": true,
      "explanation": "Markdown explanation",
      "sourceUrl": "https://www.fe-siken.com/kakomon/29_haru/q8.html"
    }
  ]
}
```

### `POST /api/quiz/{token}/submit`

容器：`web`

用途：提交首次答案。

请求：

```json
{
  "answers": [
    { "questionIndex": 1, "selectedAnswer": "エ" },
    { "questionIndex": 2, "selectedAnswer": "ア" }
  ]
}
```

规则：

- 必须包含 20 个答案。
- 每个 `questionIndex` 必须存在于 session。
- `selectedAnswer` 必须是该题有效选项。
- 如果 token 已提交，返回已提交结果，不更新历史。

响应：

```json
{
  "status": "submitted",
  "summary": {
    "totalQuestions": 20,
    "correctCount": 15,
    "incorrectCount": 5,
    "accuracy": 0.75
  }
}
```

## 4. Bot 内部服务接口

这些不是公开 HTTP API，而是 bot 容器内部模块边界。

### `parseScope(input, userId)`

输出：

```json
{
  "status": "matched",
  "method": "local_exact",
  "scopeType": "minor_category",
  "majorCategory": "ネットワーク",
  "minorCategory": "通信プロトコル",
  "candidateMinorCategories": ["通信プロトコル"],
  "matchedTopics": [],
  "matchedCategories": ["通信プロトコル"],
  "suggestions": []
}
```

### `createQuizSession(userId, rawScopeInput, matchedScope)`

输出：

```json
{
  "sessionId": "session-id",
  "token": "random-token",
  "quizUrl": "https://example.com/quiz/random-token"
}
```

## 5. 错误码

| 错误码 | HTTP 状态 | 说明 |
|---|---:|---|
| `INVALID_TOKEN` | 404 | token 不存在 |
| `TOKEN_EXPIRED` | 410 | 未提交 token 已过期 |
| `QUIZ_LOAD_FAILED` | 500 | 题目或结果数据加载失败 |
| `QUIZ_ALREADY_SUBMITTED` | 409 | token 已提交；API 应返回已提交结果 |
| `RATE_LIMITED` | 429 | 请求过于频繁 |
| `INCOMPLETE_ANSWERS` | 422 | 未提交满 20 题 |
| `INVALID_ANSWER` | 422 | 答案不属于该题选项 |
| `QUESTION_NOT_IN_SESSION` | 422 | 提交了 session 中不存在的题号 |
| `SUBMIT_FAILED` | 500 | 保存提交失败 |
| `SCOPE_NO_MATCH` | 422 | 用户输入无法匹配任何题目 |
| `AI_PROVIDER_UNAVAILABLE` | 503 | AI 兜底解析不可用 |
| `TELEGRAM_SEND_FAILED` | 502 | Telegram 回复失败 |

## 6. 安全与幂等

- token 必须是不可预测的随机值。
- token 页面不登录，但 token 绑定创建者 Telegram 用户。
- 未提交 token 7 天有效。
- 已提交结果永久可看。
- 首次提交写历史。
- 重复提交不写历史。
- webhook 同时使用路径 secret 和 `X-Telegram-Bot-Api-Secret-Token` header secret。

## 7. 待确认问题

MVP 限流策略：

- `GET /api/quiz/{token}` 使用轻量 IP 限流。
- `POST /api/quiz/{token}/submit` 使用更严格的 IP + token 级限流。
- Telegram webhook 主要依赖路径 secret + header secret 双校验。

待确认：

- 具体限流阈值。
