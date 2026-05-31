# 08 Integration Testing TodoList

## 目标

打通 Bot -> session/token -> Web API -> 作答提交 -> 结果页 -> 历史统计的端到端验证。

## 依赖任务

- `03_BACKEND_API.md`
- `04_TELEGRAM_BOT.md`
- `05_FRONTEND_QUIZ.md`
- `06_RESULT_AND_HISTORY.md`
- `07_AI_SCOPE_PARSING.md`

## 具体任务列表

- [x] P0-IT-01 建立测试 fixture：临时 `app.sqlite`、小型题库 fixture 或受控题库查询 mock。
- [x] P0-IT-02 集成测试：Bot 收到主题后创建 user、session、20 题和 token。
- [x] P0-IT-03 集成测试：`GET /api/quiz/{token}` active 返回 20 题且不泄漏答案。
- [x] P0-IT-04 E2E：用户打开 quiz，选择 20 题，提交。
- [x] P0-IT-05 集成测试：提交后写 `answer_records` 和统计。
- [x] P0-IT-06 E2E：提交后结果页显示成绩、原题、全部选项、答案、解析、URL。
- [x] P0-IT-07 集成测试：重复提交不新增历史。
- [x] P0-IT-08 E2E：移动端 bottom sheet 与 PC 常驻侧栏。
- [ ] P1-IT-09 集成测试：过期未提交 token 返回 expired。
- [ ] P1-IT-10 集成测试：AI 无法解析时 Bot 返回建议。

## 推荐使用的成熟工具 / 库

- Vitest
- Playwright
- MSW 或 fetch mock
- testcontainers 可选；SQLite 场景优先临时文件

## 不建议自行开发的部分

- 浏览器测试驱动
- HTTP mock server
- 自定义测试 runner

## 可能涉及的文件或模块

- `tests/integration/*.test.ts`
- `tests/e2e/quiz.spec.ts`
- `tests/fixtures/`
- `src/test-utils/`

## 测试方式

- `pnpm test`
- `pnpm test:e2e`
- Playwright 使用 mobile 390px 和 desktop 1440px viewport。

## 验收标准

- 关键业务流端到端通过。
- 所有状态：active、submitted、expired、not_found、error 都有覆盖。
- E2E 证明前后端接口已对接。

## 未确认问题 / AI 假设

- 已确认：测试环境使用 mock Telegram API，不真实发送消息。
- 已确认：MVP 自动化测试不要求接入真实 Telegram sandbox bot。
- 已确认：加入 Playwright 截图与 Figma 视觉对照检查。
