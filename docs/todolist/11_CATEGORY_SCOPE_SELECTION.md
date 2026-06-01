# Category Scope Selection TodoList

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Every implementation task must use `superpowers:test-driven-development`; every completion claim must use `superpowers:verification-before-completion`.

## 目标

将 Telegram 收到的练习范围关键词处理流程，从“优先匹配数据库 `topic`”调整为“优先匹配配置化的大分类 / 小分类，并以数据库 `questions.category` 作为主要抽题范围”。

## 背景

当前数据库中的 `questions.topic` 是单题级别的要点总结，粒度较细，不适合作为用户输入练习范围的主匹配字段。用户输入更接近考试大分类或题库 `category` 小分类，因此新流程应基于 `config/app.yaml` 中的 `topics.category_tree` 建立分类索引。

## 已确认需求

- 分类树采用方案 B：合并进 `config/app.yaml` 的 `topics.category_tree`。
- `topics.category_tree` 的顶层 key 是大分类来源。
- `topics.category_tree` 中每个大分类下的条目是小分类来源。
- 删除 `topics.standard_topics`，运行时通过 `Object.keys(topics.category_tree)` 获取大分类列表。
- 删除 `topics.standard_topic_mappings`，运行时通过 `topics.category_tree` 反推“小分类 -> 大分类”映射。
- 用户输入关键词后，先匹配大分类和小分类。
- MVP 只允许一次输入一个练习范围；`/start` 和 `/help` 必须说明这一点。
- 如果匹配到大分类，从该大分类下所有小分类对应的 `questions.category` 中抽题。
- 如果匹配到小分类，优先从该小分类对应的 `questions.category` 中抽题。
- 如果小分类题目足够，则只从该小分类出题；如果小分类题目不足，则从同一大分类下的兄弟小分类中补足。
- 如果本地分类无法匹配，再让 AI 从分类列表中推荐匹配项。
- AI 只能从已有大分类 / 小分类中推荐，不允许生成新分类。
- AI 推荐结果不直接创建练习，必须用 Telegram inline button 形式交由用户选择。
- 常错题、低正确率主题、高权重 fallback 逻辑保持之前规则。
- `questions.topic` 不再作为范围匹配的主入口，只作为题目要点、统计和后续弱项分析参考。

## AI 假设

- “题目数不够”在 MVP 中按生成 20 题所需的候选池不足判断；实现时应至少满足用户指定范围 15 题，不足时用兄弟分类补足。
- 小分类补足只在同一大分类内进行，不跨大分类补足；跨大分类仍由常错/弱项/高权重的 5 题逻辑负责。
- 分类树运行时来源已确认采用 `config/app.yaml`，不新增独立运行时配置文件。

## 未确认问题

- `high_weight_topics` 是否继续手工配置，或后续也从 `category_tree` 顶层 key 派生。

## 推荐使用的成熟工具 / 库

- `yaml`: 读取和校验 `config/app.yaml` 中的 `topics.category_tree`。
- `zod`: 校验分类配置结构。
- `Fuse.js`: 继续用于本地相近分类建议。
- `OpenAI SDK`: 仅在本地匹配失败时，从已有分类列表中推荐。
- `Vitest`: 单元测试与集成测试。

## 不建议自行开发的部分

- 不手写 YAML parser。
- 不手写模糊搜索算法。
- 不让 AI 自由生成分类文本。
- 不使用字符串拼接构造 SQL；继续使用 `better-sqlite3` 参数化查询。

## 可能涉及的文件或模块

- `config/app.yaml`
- `src/config/schema.ts`
- `src/config/app-config.ts`
- `src/quiz/scope-match.ts`
- `src/ai/scope-parser.ts`
- `src/db/question-bank/queries.ts`
- `src/bot/quiz-session-factory.ts`
- `src/bot/handlers/scope-message.ts`
- `src/bot/main.ts`
- `src/db/app/repositories/quiz-sessions.ts`
- 相关测试文件：
  - `src/config/app-config.test.ts`
  - `src/quiz/scope-match.test.ts`
  - `src/ai/scope-parser.test.ts`
  - `src/db/question-bank/queries.test.ts`
  - `src/bot/quiz-session-factory.integration.test.ts`
  - `src/bot/handlers/scope-message.integration.test.ts`

## 任务列表

### 任务 1: 将分类树合并进 app.yaml

**目标:** 按已确认的方案 B，将大分类 / 小分类映射合并到 `config/app.yaml` 的 `topics.category_tree` 下。

**依赖任务:** 无。

- [x] 将 `docs/question-categories.yaml` 的内容迁移进 `config/app.yaml`：
  - 路径：`topics.category_tree`
  - 顶层 key：大分类
  - value：对应小分类数组
- [x] 删除 `topics.standard_topics`。
- [x] 删除 `topics.standard_topic_mappings`。
- [x] 将所有读取大分类列表的代码改为从 `Object.keys(topics.category_tree)` 派生。
- [x] 将所有读取“小分类 -> 大分类”映射的代码改为从 `topics.category_tree` 反推。
- [x] 删除或归档 `docs/question-categories.yaml`，避免运行时配置来源重复。
- [x] 更新配置文档，说明大分类和小分类都来自 `topics.category_tree`。
- [x] 增加配置校验测试：
  - `high_weight_topics` 必须全部存在于 `category_tree` 顶层 key。
  - 每个小分类只能出现一次。
  - 小分类列表不能为空，除非明确允许该大分类暂时无题。

**测试方式:**

- `pnpm vitest run src/config/app-config.test.ts`
- 构造重复小分类、未知大分类、空分类的失败用例。

**验收标准:**

- 分类树能从 `config/app.yaml` 被运行时代码读取。
- 配置不一致时启动前或测试中失败。
- 所有 97 个当前小分类无丢失、无重复。

### 任务 2: 定义分类匹配结果模型

**目标:** 替换或扩展当前 `ScopeParseResult`，让系统能区分“大分类命中”和“小分类命中”。

**依赖任务:** 任务 1。

- [x] 设计新的匹配结果结构，例如：
  - `scopeType: "major_category" | "minor_category" | "no_match" | "ai_unavailable"`
  - `majorCategory`
  - `minorCategory`
  - `candidateMinorCategories`
  - `method: "local_exact" | "local_alias" | "local_fuzzy" | "openai"`
- [x] 保留兼容字段或一次性迁移现有 `matchedTopics` / `matchedCategories` 使用点。
- [x] 在测试中覆盖：
  - 输入大分类 `ネットワーク`。
  - 输入小分类 `通信プロトコル`。
  - 输入 alias `网络`。
  - 输入无法匹配的文本。

**测试方式:**

- `pnpm vitest run src/quiz/scope-match.test.ts`

**验收标准:**

- 大分类和小分类命中结果语义清晰。
- 不再把标准大分类误当成数据库 `topic`。
- 旧的无匹配建议逻辑仍可工作。

### 任务 3: 实现本地大分类 / 小分类匹配优先级

**目标:** 用户输入先匹配大分类和小分类，而不是先匹配数据库 `topic`。

**依赖任务:** 任务 2。

- [ ] 匹配前对输入和分类名执行现有 NFKC、日文小写、空白去除归一化。
- [ ] 小分类精确匹配优先于大分类精确匹配。
- [ ] 一次只接受一个练习范围。
- [ ] 如果用户输入明确包含多个范围，返回提示并要求重新输入单个范围。
- [ ] 大分类 alias 继续可用，例如 `网络` -> `ネットワーク`。
- [ ] 小分类可直接匹配数据库 `category` 名，例如 `通信プロトコル`。
- [ ] 若本地无法精确匹配，使用 Fuse.js 给出本地建议。

**测试方式:**

- `pnpm vitest run src/quiz/scope-match.test.ts`

**验收标准:**

- `ネットワーク` 命中大分类。
- `通信プロトコル` 命中小分类，并能反查父级 `ネットワーク`。
- `ネットワークを練習したい` 能被合理匹配或给出建议。
- `ネットワークとデータベース` 不直接创建练习，提示用户只输入一个范围。
- `questions.topic` 不参与范围主匹配。

### 任务 4: 调整 AI 分类推荐输入与输出

**目标:** 本地无匹配时，AI 只能从现有大分类 / 小分类中推荐。

**依赖任务:** 任务 2、任务 3。

- [ ] 更新 AI prompt 输入：
  - 用户原始输入。
  - 大分类列表。
  - 小分类列表及其父级。
  - 规则：只返回已有分类，不创建新分类。
- [ ] 更新 AI JSON schema：
  - 支持返回大分类或小分类。
  - 支持返回候选建议。
  - 禁止额外字段。
- [ ] AI 匹配结果用于生成候选按钮，不直接创建练习。
- [ ] 候选按钮 payload 必须能标识候选类型和名称，例如大分类或小分类。
- [ ] 对 AI 返回结果做白名单过滤：
  - 大分类必须存在于分类树顶层。
  - 小分类必须存在于分类树值列表。
- [ ] AI 不可用时，继续返回本地建议。

**测试方式:**

- `pnpm vitest run src/ai/scope-parser.test.ts`

**验收标准:**

- AI 返回不存在分类时被过滤。
- AI 返回小分类时能带出对应大分类。
- AI 返回候选时，Bot 进入“等待用户选择候选分类”的交互，而不是立即创建 token。
- AI 失败时不阻断 Bot，仍提示用户相近候选。

### 任务 5: 增加按 category 列表查询候选题能力

**目标:** 题库查询支持 `category IN (...)`，用于大分类展开和兄弟分类补足。

**依赖任务:** 任务 1。

- [ ] 在 `src/db/question-bank/queries.ts` 增加按多个 category 查询候选题的能力。
- [ ] 保持 `exam_part = '科目A'` 固定过滤。
- [ ] 保持 URL 去重。
- [ ] 保持参数化 SQL。
- [ ] 避免使用 `questions.topic` 作为范围筛选主条件。

**测试方式:**

- `pnpm vitest run src/db/question-bank/queries.test.ts`

**验收标准:**

- 查询 `["通信プロトコル", "ネットワーク方式"]` 能返回对应 category 的题。
- 空 category 列表返回空数组或明确错误，行为需测试固定。
- 不影响已有单 category / URL 查询。

### 任务 6: 实现大分类抽题候选池

**目标:** 匹配大分类时，从其全部小分类的 `questions.category` 中抽取题目。

**依赖任务:** 任务 5。

- [ ] 将大分类转换为小分类列表。
- [ ] 查询这些小分类下的全部候选题。
- [ ] 按现有选题排序策略选择前 15 道用户指定范围题。
- [ ] 保持后 5 道常错 / 弱项 / 高权重逻辑不变。
- [ ] `selectionSummaryJson` 中记录命中的大分类和实际使用的小分类。

**测试方式:**

- `pnpm vitest run src/bot/quiz-session-factory.integration.test.ts`

**验收标准:**

- 输入 `ネットワーク` 时，候选题来自 `データ通信と制御`、`ネットワーク応用`、`ネットワーク方式`、`ネットワーク管理`、`通信プロトコル`。
- 不再要求数据库中存在 `topic = ネットワーク`。
- 生成 session 仍为 20 题。

### 任务 7: 实现小分类优先与兄弟分类补足

**目标:** 匹配小分类时，先抽该小分类；不足时从同一大分类的兄弟小分类补足。

**依赖任务:** 任务 5、任务 6。

- [ ] 小分类命中后先查询 `category = minorCategory`。
- [ ] 如果该小分类题量足够满足用户指定范围题数，则不混入兄弟小分类。
- [ ] 如果不足用户指定范围题数，从同父级大分类下其他小分类补足。
- [ ] 补足时排除已经选中的题。
- [ ] `selectionSummaryJson` 记录：
  - primaryMinorCategory
  - siblingMinorCategoriesUsed
  - requestedScopeCount
- [ ] 常错 / 弱项 / 高权重 5 题逻辑保持不变。

**测试方式:**

- `pnpm vitest run src/bot/quiz-session-factory.integration.test.ts`

**验收标准:**

- 输入 `通信プロトコル` 时，优先选择 `category = 通信プロトコル`。
- 当 `通信プロトコル` 足够时，用户指定范围题全部来自 `通信プロトコル`。
- 当 `通信プロトコル` 不足时，从 `ネットワーク` 下的兄弟分类补足。
- 不跨到其他大分类补足用户指定范围题。

### 任务 8: 更新 Bot 用户反馈文案

**目标:** Bot 能在成功和失败时表达新的分类匹配结果。

**依赖任务:** 任务 2、任务 4、任务 6、任务 7。

- [ ] 成功创建练习时，可继续只发送按钮，不暴露内部分类细节。
- [ ] `/start` 文案说明第一版一次只输入一个练习范围。
- [ ] `/help` 文案说明第一版一次只输入一个练习范围，并给出单范围示例。
- [ ] 无匹配但有建议时，建议文案使用已有大分类 / 小分类名称。
- [ ] AI 推荐多个候选时，按配置顺序或相关性排序展示为 Telegram inline buttons。
- [ ] 用户点击候选按钮后，再按该候选分类创建练习 token。
- [ ] 日文文案保持一致。

**测试方式:**

- `pnpm vitest run src/bot/handlers/scope-message.test.ts src/bot/handlers/scope-message.integration.test.ts`

**验收标准:**

- 匹配成功仍发送 `問題を開く` inline button。
- `/start` 和 `/help` 明确提示“一次输入一个范围”。
- 无匹配建议中不出现不存在的分类。
- AI 候选建议以按钮形式展示，并且点击后才创建练习。

### 任务 9: 更新统计与历史使用说明

**目标:** 明确 `topic`、`category`、大分类在历史统计中的角色，避免后续选题逻辑混乱。

**依赖任务:** 任务 6、任务 7。

- [ ] 确认 `answer_records` 继续记录题目 URL、正确答案和用户答案。
- [ ] `user_question_stats` 逻辑保持不变。
- [ ] `user_topic_stats` 中：
  - `topic` 继续表示题目要点。
  - `category` 表示数据库小分类。
  - `configured_topic` 或新字段表示大分类。
- [ ] 文档中说明常错题 / 弱项题的来源不受分类匹配改造影响。

**测试方式:**

- `pnpm vitest run src/server/quiz-submit*.test.ts src/db/app/**/*.test.ts`

**验收标准:**

- 首次提交历史记录规则不变。
- 低正确率主题逻辑继续可用于后 5 道补强题。
- 分类改造不会导致重复提交写历史。

### 任务 10: 更新文档和回归测试

**目标:** 文档、测试和验收流程同步新的分类匹配设计。

**依赖任务:** 任务 1-9。

- [ ] 更新 `docs/PRD.md` 的业务规则。
- [ ] 更新 `docs/USER_FLOW.md` 的 Bot 关键词处理流程。
- [ ] 更新 `docs/DATA_MODEL.md` 中 `questions.topic` 和 `questions.category` 的职责说明。
- [ ] 更新 `docs/API_SPEC.md` 中 Telegram webhook 处理步骤。
- [ ] 更新相关 TodoList checkbox。
- [ ] 运行完整验证。

**测试方式:**

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- 如影响 Web 响应结构，运行 `pnpm test:e2e`

**验收标准:**

- 文档和实现一致。
- 全量测试通过。
- Bot 输入大分类、小分类、未知词都覆盖测试。

## 建议执行顺序

1. 任务 1：将分类树合并进 app.yaml
2. 任务 2：定义分类匹配结果模型
3. 任务 3：实现本地大分类 / 小分类匹配优先级
4. 任务 4：调整 AI 分类推荐输入与输出
5. 任务 5：增加按 category 列表查询候选题能力
6. 任务 6：实现大分类抽题候选池
7. 任务 7：实现小分类优先与兄弟分类补足
8. 任务 8：更新 Bot 用户反馈文案
9. 任务 9：更新统计与历史使用说明
10. 任务 10：更新文档和回归测试

## 完成标准

- 用户输入大分类时，使用该大分类下所有小分类的 `questions.category` 抽题。
- 用户输入小分类时，优先使用该小分类，不足时使用同父级兄弟分类补足。
- 小分类题量足够时，不混入兄弟分类。
- 本地无匹配时，AI 从现有分类树中推荐，不生成新分类，并通过 Telegram inline buttons 让用户选择。
- MVP 一次只允许一个练习范围，`/start` 和 `/help` 中必须说明。
- 常错题、低正确率主题、高权重补强逻辑保持原行为。
- `questions.topic` 不再作为用户范围匹配主入口。
- 全量测试、类型检查和 lint 通过。
