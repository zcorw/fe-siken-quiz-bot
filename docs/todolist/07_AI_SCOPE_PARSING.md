# 07 AI Scope Parsing TodoList

## 目标

实现用户输入范围解析：优先 YAML/题库匹配，失败时使用 OpenAI API 结构化解析和相近主题建议。

## 依赖任务

- `01_FOUNDATION.md`
- `02_DATABASE.md`

## 具体任务列表

- [x] P0-AI-01 定义标准主题、别名、高权重主题的 YAML schema。
- [x] P0-AI-02 实现 alias exact/normalized match。
- [x] P0-AI-03 实现 `questions.category` 和 `questions.topic` 关键词匹配。
- [x] P0-AI-04 实现 parse result：matchedTopics、matchedCategories、suggestions、method、status。
- [x] P0-AI-05 实现 OpenAI fallback，使用官方 SDK 和结构化 JSON 输出。
- [x] P0-AI-06 AI 只允许返回题库已有主题或 YAML 标准主题，不生成新主题。
- [x] P0-AI-07 AI 不可生成题目、改写题干、判断答案或生成额外解析。
- [x] P0-AI-08 无匹配时返回 2-3 个相近主题建议。
- [x] P0-AI-09 写入 `scope_parse_logs`。
- [ ] P1-AI-10 添加 OpenAI 不可用 fallback：若本地匹配失败，不创建测试，返回无法解析和建议稍后重试。
- [ ] P1-AI-11 无匹配时返回相近主题建议；如果没有建议，则提示用户重新输入。
- [ ] P1-AI-12 为中日文输入建立测试用例。

## 推荐使用的成熟工具 / 库

- OpenAI official SDK
- Zod
- Fuse.js 或轻量成熟 fuzzy match 库

## 不建议自行开发的部分

- LLM HTTP client
- JSON schema validation
- 模糊匹配算法

## 可能涉及的文件或模块

- `src/ai/openai-client.ts`
- `src/ai/scope-parser.ts`
- `src/quiz/scope-match.ts`
- `src/config/schema.ts`
- `config/app.yaml`
- `src/db/app/repositories/scope-logs.ts`

## 测试方式

- Unit：alias 命中不调用 AI。
- Unit：category/topic 命中不调用 AI。
- Unit：本地无匹配时调用 mocked OpenAI。
- Unit：AI 返回不存在主题时被拒绝或转为 no_match。

## 验收标准

- 解析顺序为 YAML alias -> category/topic -> AI fallback。
- OpenAI model 从 YAML 读取，默认 `gpt-4.1-mini`。
- 所有解析结果可追踪记录。

## 未确认问题 / AI 假设

- 已确认：OpenAI API 失败且本地匹配失败时，不创建测试，提示稍后重试。
- 已确认：无匹配时返回相近主题建议；没有建议则提示重新输入。
- AI 假设：OpenAI 输出使用 JSON schema/structured output 能力；若当前 SDK 环境不可用，退回 Zod parse 普通 JSON。
- AI 假设：主题别名初始 YAML 内容由现有高权重主题列表和题库 topic/category 派生。
