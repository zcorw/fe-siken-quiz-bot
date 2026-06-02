# 12 Randomized Question Selection TodoList

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Every implementation task must use `superpowers:test-driven-development`; every bug, failed test, or unexpected selection behavior must use `superpowers:systematic-debugging`; every completion claim must use `superpowers:verification-before-completion`.

## 目标

让相同练习范围在多次创建 token 时尽量获得不同题目，同时保留既有业务优先级：用户未做过题优先、错得多的题优先、低正确率主题优先、常错 / 弱项 / 高权重补强逻辑不被破坏。

## 背景

当前选题结果较固定，主要原因是题库候选查询按 `id ASC` 返回，上层再直接 `slice(0, 15)`、`slice(0, 20)`、`slice(0, 5)`。因此同一个范围关键词每次都会选择同一批靠前题目。

需要在候选池选择阶段加入随机性，而不是改变范围匹配逻辑。随机性应作用于同等优先级内的排序，并且要避免完全随机导致用户一直练不到重要弱项。

## 已确认需求

- 相同范围关键词不应总是生成完全相同的一套题。
- 随机性用于“同等优先级候选题”之间。
- 用户指定范围内的 15 道题仍然优先选择：
  - 用户未做过的题。
  - 用户错得多的题。
- 后 5 道补强题仍然遵循既有逻辑：
  - 历史错题。
  - 低正确率主题。
  - 高权重主题 fallback。
- 题目不能重复。
- 每个 token 的 20 道题仍然按 session 固定，一旦创建 token 后再次打开同一 token 不应重新随机。
- 题目最终展示顺序也要随机化，并把随机后的顺序保存为 `question_index`。
- 权重优先级中，历史错题高于未做过题。
- 不在前端页面显示 selection seed。
- 不使用 SQLite `ORDER BY RANDOM()` 作为主要方案。
- 不修改 UI。
- 不修改 Telegram 范围匹配流程。

## AI 假设

- 随机 seed 可以在创建 quiz session 时生成，并记录进 `selection_summary_json`，不需要新增数据库字段。
- MVP 中不要求用户指定“随机强度”。
- 如果某个范围候选题数量不足 20，道题差异会自然受限；此时不强行跨无关分类补题。
- 如果用户历史数据为空，则随机性主要来自候选池打散和高权重 fallback。
- 不额外实现“最近 N 次强制排除重复题”规则；通过题目选择随机化和最终展示顺序随机化，降低短时间内完全重复同一套题的概率。

## 未确认问题

- 暂无。后续如需要“最近 N 次强制排除重复题”，再追加非 MVP 增强任务。

## 推荐使用的成熟工具 / 库

- `better-sqlite3`: 继续使用参数化 SQL 查询候选题和用户历史。
- `Drizzle ORM`: 继续用于 app.sqlite 中 session、答题历史和统计表访问。
- `Vitest`: 覆盖随机选题、权重排序、去重、seed 固定行为。
- `node:crypto`: 使用 `randomUUID()` 或 `crypto.getRandomValues()` / `randomInt()` 生成 seed。

## 不建议自行开发的部分

- 不手写复杂概率分布库。
- 不使用数据库字符串拼接生成随机 SQL。
- 不在题库 SQL 中使用大范围 `ORDER BY RANDOM()`。
- 不把随机逻辑散落在 Bot handler、API route 和 repository 多处。
- 不让 OpenAI 参与具体题目随机选择。

## 可能涉及的文件或模块

- `src/bot/quiz-session-factory.ts`
- `src/bot/quiz-session-factory.integration.test.ts`
- `src/db/question-bank/queries.ts`
- `src/db/question-bank/queries.test.ts`
- `src/db/app/repositories/quiz-sessions.ts`
- `src/db/app/repositories/quiz-sessions.test.ts`
- `src/db/app/schema.ts`
- `docs/PRD.md`
- `docs/USER_FLOW.md`
- `docs/DATA_MODEL.md`
- `docs/todolist/00_PROJECT_OVERVIEW.md`

## 任务列表

### 任务 1: 定义随机选题策略边界

**目标:** 明确随机性只影响候选题排序，不改变范围匹配、token 生命周期和提交记录规则。

**依赖任务:** 无。

- [x] 阅读 `src/bot/quiz-session-factory.ts` 当前候选题生成流程。
- [x] 阅读 `src/db/question-bank/queries.ts` 当前 `ORDER BY id ASC` 查询行为。
- [x] 确认哪些分支会直接对候选题执行 `slice(...)`。
- [x] 在本文件中补充最终确认的展示顺序策略：
  - 已确认：选择随机，展示顺序也随机。
- [x] 将“最近 N 次强制排除重复题”标记为非 MVP；当前只通过随机选题和随机展示顺序降低完全重复概率。

**测试方式:**

- 文档任务，无自动测试。

**验收标准:**

- 随机化影响范围清楚。
- 未确认问题已关闭或明确标记为 AI 假设 / 非 MVP。

### 任务 2: 为候选题随机化增加可测试工具函数

**目标:** 创建纯函数处理候选题打散、seed 固定、去重和截取，避免随机逻辑散落在业务流程中。

**依赖任务:** 任务 1。

- [x] 新建或选择一个聚合位置，例如 `src/quiz/question-selection.ts`。
- [x] 先写失败测试，覆盖相同 seed 结果稳定：
  - 输入 30 道候选题。
  - 使用 seed `seed-a` 选 20 道。
  - 连续调用两次结果完全一致。
- [x] 先写失败测试，覆盖不同 seed 结果有差异：
  - 输入 30 道候选题。
  - 使用 seed `seed-a` 和 `seed-b`。
  - 两次结果至少有一个题目或顺序不同。
- [x] 先写失败测试，覆盖不重复：
  - 输入中包含重复 URL。
  - 输出不包含重复 URL。
- [x] 实现稳定 seed shuffle。
- [x] 不依赖 `Math.random()` 直接产生不可测试结果；生产 seed 可随机生成，但 shuffle 函数应接收 seed。

**推荐使用的成熟工具 / 库:**

- `node:crypto` 用于生成生产 seed。
- 简单 seeded PRNG 可在本地实现为很小的纯函数；不引入大型依赖。

**测试方式:**

- `pnpm vitest run src/quiz/question-selection.test.ts`

**验收标准:**

- 相同 seed 结果稳定。
- 不同 seed 对足够大的候选池产生不同结果。
- 输出无重复 URL。
- 函数不访问数据库，不依赖当前时间。

### 任务 3: 引入用户历史权重排序

**目标:** 在随机性基础上保留“未做过 / 错得多 / 低正确率”优先级。

**依赖任务:** 任务 2。

- [x] 梳理 app.sqlite 中已有统计表：
  - `answer_records`
  - `user_question_stats`
  - `user_topic_stats`
- [x] 设计 `QuestionSelectionScore` 输入结构：
  - question URL。
  - topic。
  - category。
  - attempt count。
  - incorrect count。
  - accuracy。
- [x] 先写失败测试，覆盖未做过题优先于做过且正确率高的题。
- [x] 先写失败测试，覆盖错得多的题在已做过题中优先级更高。
- [x] 先写失败测试，覆盖历史错题优先级高于未做过题。
- [x] 先写失败测试，覆盖同权重题通过 seed 随机排序。
- [x] 实现权重排序：
  - 先按权重分组。
  - 每个权重组内 seeded shuffle。
  - 最后合并并截取需要数量。

**推荐使用的成熟工具 / 库:**

- `Drizzle ORM` 查询用户题目统计。
- `Vitest` 测试纯排序函数。

**测试方式:**

- `pnpm vitest run src/quiz/question-selection.test.ts`

**验收标准:**

- 错题不会被未做过题压过。
- 未做过题优先于已做过且正确率高的题。
- 错题权重可预测，且高于未做过题。
- 同权重题结果随 seed 变化。

### 任务 4: 查询创建练习所需的用户题目统计

**目标:** 在创建 token 时取得当前 Telegram 用户的题目和主题历史，用于计算权重。

**依赖任务:** 任务 3。

- [x] 检查 `createQuizSessionFromScopeMessage` 中已取得的 `user.id`。
- [x] 新增 repository 查询函数，按 `userId` 和候选题 URL 列表读取 `user_question_stats`。
- [x] 如需要主题弱项，新增按 `userId` 和 topic/category 读取 `user_topic_stats` 的查询。
- [x] 先写 repository 失败测试：
  - 无历史时返回空 map。
  - 有历史时按 URL 返回统计。
  - 未传候选 URL 时不执行无意义查询或返回空结果。
- [x] 实现 repository 查询。

**测试方式:**

- `pnpm vitest run src/db/app/repositories/quiz-sessions.test.ts`
- 或新增专用 repository 测试文件。

**验收标准:**

- 查询使用参数化 SQL / Drizzle。
- 空候选列表安全返回。
- 不影响已有 session 创建和提交逻辑。

### 任务 5: 随机化用户指定范围内的 15 道题

**目标:** 对前 15 道用户指定范围题进行“权重优先 + 同权重随机”选择。

**依赖任务:** 任务 2、任务 3、任务 4。

- [x] 在 `createQuizSessionFromScopeMessage` 中生成本次 `selectionSeed`。
- [x] 将范围候选题交给选题工具函数处理。
- [x] 保留大分类 / 小分类 / 兄弟分类补足规则。
- [x] 对最终 20 道题执行 seed 派生的展示顺序随机化，再写入 `question_index` 1-20。
- [x] 先写集成失败测试：
  - 同一用户、同一范围、同一候选池，两个不同 token 使用不同 seed。
  - 两次创建出的 20 道题不完全相同。
- [x] 先写集成失败测试：
  - 两次创建出的题目顺序不完全相同。
- [x] 先写集成失败测试：
  - 设置某些题为历史错题。
  - 错题优先于未做过题进入前 15。
- [x] 实现前 15 道题随机化。

**测试方式:**

- `pnpm vitest run src/bot/quiz-session-factory.integration.test.ts`

**验收标准:**

- 相同范围多次创建 session 时，足够大的候选池会产生不同题目组合。
- 相同范围多次创建 session 时，足够大的候选池会产生不同题目顺序。
- 候选池不足时仍尽可能生成 20 题或按既有错误逻辑报错。
- `question_index` 仍为 1-20。

### 任务 6: 随机化后 5 道补强题

**目标:** 对补强题保持错题 / 弱项 / 高权重优先，同时避免每次都拿相同 fallback 题。

**依赖任务:** 任务 3、任务 4、任务 5。

- [ ] 梳理当前后 5 道题来源，确认是否已经实现真实错题 / 弱项逻辑，还是仍为高权重 fallback。
- [ ] 先写失败测试，覆盖高权重 fallback 候选池足够时不同 seed 选出不同题。
- [ ] 先写失败测试，覆盖补强题不能重复使用前 15 道题。
- [ ] 如果已有错题候选，先写失败测试覆盖错题优先。
- [ ] 实现补强题候选池随机化。

**测试方式:**

- `pnpm vitest run src/bot/quiz-session-factory.integration.test.ts`

**验收标准:**

- 后 5 道题不会固定为同一批 `id ASC` 题目。
- 不与前 15 道重复。
- 补强来源统计仍写入 `selectionSummaryJson`。

### 任务 7: 记录 selection seed 和选题摘要

**目标:** 让每次随机选题可追踪，方便排查“为什么选出这些题”。

**依赖任务:** 任务 5、任务 6。

- [ ] 在 `selectionSummaryJson` 中增加：
  - `selectionSeed`
  - `randomizationVersion`
  - `randomizedRequestedScope`
  - `randomizedReinforcement`
- [ ] 先写失败测试，读取 `quiz_sessions.selection_summary_json` 并断言包含 seed。
- [ ] 确认 API 返回给前端的 `selectionSummary` 是否需要隐藏 seed。
- [ ] 默认不在 Web 结果页展示 seed。

**测试方式:**

- `pnpm vitest run src/bot/quiz-session-factory.integration.test.ts`
- 如 API schema 受影响，运行 `pnpm vitest run src/quiz/quiz-service.test.ts`

**验收标准:**

- 后台能追踪 seed。
- 前端结果页不出现不必要的调试信息。
- 前端作答页和结果页都不展示 seed。
- JSON schema / DTO 不因新增字段破坏现有页面。

### 任务 8: 固定同一 token 的题目不重新随机

**目标:** 确认随机化只发生在创建 session 时，加载 `/quiz/{token}` 时只读取已保存题目。

**依赖任务:** 任务 5、任务 7。

- [ ] 阅读 `loadQuizByToken` 当前读取逻辑。
- [ ] 先写测试：
  - 创建 session 后连续加载同一 token 两次。
  - 两次返回的题目 URL 和 `question_index` 完全一致。
- [ ] 如果现有测试已覆盖，补充 seed 随机化后的回归断言。

**测试方式:**

- `pnpm vitest run src/quiz/quiz-service.test.ts`

**验收标准:**

- 同一 token 不会在页面刷新时换题。
- 已提交 token 再次打开结果页仍保持原题顺序。

### 任务 9: 更新文档和业务规则

**目标:** 将随机选题策略写入需求和技术文档，避免后续误以为题目应固定按 id 选。

**依赖任务:** 任务 1-8。

- [ ] 更新 `docs/PRD.md`：
  - 相同范围多次练习应尽量覆盖不同题。
  - 同权重候选题随机。
- [ ] 更新 `docs/USER_FLOW.md`：
  - Bot 创建 token 时进行一次选题并固化到 session。
- [ ] 更新 `docs/DATA_MODEL.md`：
  - `selection_summary_json` 可包含 selection seed 和随机化版本。
- [ ] 更新 `docs/todolist/00_PROJECT_OVERVIEW.md`：
  - 将“同等优先级选题内随机”补充为已确认规则。
- [ ] 更新本 TodoList checkbox。

**测试方式:**

- 文档检查。

**验收标准:**

- 文档与实现一致。
- 没有描述成每次打开 token 都重新随机。

### 任务 10: 全量回归验证

**目标:** 确认随机化没有破坏范围匹配、提交、结果页和部署相关能力。

**依赖任务:** 任务 1-9。

- [ ] 运行 `pnpm test src/quiz/question-selection.test.ts`。
- [ ] 运行 `pnpm vitest run src/bot/quiz-session-factory.integration.test.ts`。
- [ ] 运行 `pnpm vitest run src/quiz/quiz-service.test.ts`。
- [ ] 运行 `pnpm test`。
- [ ] 运行 `pnpm typecheck`。
- [ ] 运行 `pnpm lint`。
- [ ] 如果页面 DTO 或展示顺序变化，运行 `pnpm test:e2e`。

**验收标准:**

- 所有相关测试通过。
- 相同范围重复创建练习时，在候选池足够大的情况下题目组合有差异。
- 相同范围重复创建练习时，在候选池足够大的情况下题目顺序有差异。
- 同一 token 多次打开题目不变。
- 提交和结果页正常。

## 建议执行顺序

1. 任务 1：定义随机选题策略边界。
2. 任务 2：为候选题随机化增加可测试工具函数。
3. 任务 3：引入用户历史权重排序。
4. 任务 4：查询创建练习所需的用户题目统计。
5. 任务 5：随机化用户指定范围内的 15 道题。
6. 任务 6：随机化后 5 道补强题。
7. 任务 7：记录 selection seed 和选题摘要。
8. 任务 8：固定同一 token 的题目不重新随机。
9. 任务 9：更新文档和业务规则。
10. 任务 10：全量回归验证。

## 完成标准

- 同一用户输入相同范围时，不会总是生成同一套题。
- 同一用户输入相同范围时，不会总是按同一顺序展示题。
- 随机性不覆盖业务优先级。
- 错题权重高于未做过题。
- 同一 token 的题目固定。
- 题目不重复。
- seed 和随机化版本可在后台追踪。
- seed 不在前端展示。
- 文档、测试和实现一致。
- `pnpm test`、`pnpm typecheck`、`pnpm lint` 通过。
