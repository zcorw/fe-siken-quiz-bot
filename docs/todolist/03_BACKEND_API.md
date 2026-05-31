# 03 Backend API TodoList

## 目标

实现 Web API：加载 quiz、提交答案、错误响应、限流、Markdown 安全数据输出。

## 依赖任务

- `01_FOUNDATION.md`
- `02_DATABASE.md`

## 具体任务列表

- [x] P0-API-01 定义 API DTO 和 Zod schema：active response、submitted response、submit request、error response。
- [x] P0-API-00 所有 API route 明确使用 Node.js runtime，以支持本地 SQLite 文件访问。
- [x] P0-API-02 实现 `GET /api/quiz/[token]` active 状态，隐藏正确答案、解析、source URL。
- [ ] P0-API-03 实现 `GET /api/quiz/[token]` submitted 状态，返回 summary、selectionSummary、原题、全部选项、用户答案、正确答案、解析、source URL。
- [ ] P0-API-04 实现 token not found、expired、load failed 错误映射。
- [ ] P0-API-05 实现 `POST /api/quiz/[token]/submit` 请求校验：20 题完整、题号存在、选项合法。
- [ ] P0-API-06 实现 submit 成功响应和事务调用。
- [ ] P0-API-07 实现 repeated submit：返回已提交结果，不更新历史。
- [ ] P1-API-08 使用成熟限流库实现限流：GET 每 IP 60/min，POST 每 IP 10/min + 每 token 3/min。
- [ ] P1-API-09 添加 API route tests，覆盖所有错误码。
- [ ] P1-API-10 增加 Markdown 输出安全策略：API 保留 Markdown，前端渲染时 sanitizer；API 不拼 HTML。

## 推荐使用的成熟工具 / 库

- Next.js Route Handlers
- Zod
- rate-limiter-flexible 或 @upstash/ratelimit 的本地替代方案
- Vitest / Supertest 风格测试

## 不建议自行开发的部分

- request schema parser
- rate limit bucket
- Markdown sanitizer

## 可能涉及的文件或模块

- `app/api/quiz/[token]/route.ts`
- `app/api/quiz/[token]/submit/route.ts`
- `src/quiz/api-schemas.ts`
- `src/quiz/quiz-service.ts`
- `src/quiz/submit-service.ts`
- `src/lib/api-response.ts`
- `src/lib/rate-limit.ts`

## 测试方式

- `GET` active 不包含 `correctAnswer`、`explanation`、`sourceUrl`。
- `GET` submitted 包含结果页所有字段。
- `POST` 未答满返回 `INCOMPLETE_ANSWERS`。
- `POST` 无效选项返回 `INVALID_ANSWER`。
- 重复 `POST` 不新增历史记录。

## 验收标准

- API 符合 `docs/API_SPEC.md`。
- 结果页字段满足当前 Figma：移动端单列、PC 左列表右详情都能从同一 response 渲染。
- 错误码稳定且可供前端区分。

## 未确认问题 / AI 假设

- 已确认：Next.js API 使用 Node.js runtime，不使用 Edge runtime。
- 已确认：API response 中 `choices` 使用数组，保持选项顺序。
- 已确认：API 限流默认值为 GET 每 IP 60/min，POST 每 IP 10/min + 每 token 3/min。
