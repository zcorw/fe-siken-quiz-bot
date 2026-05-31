# 02 Database TodoList

## 目标

完成题库 SQLite 只读访问、`app.sqlite` Drizzle migration、运行期数据模型、选题所需统计查询。

## 依赖任务

- `01_FOUNDATION.md`

## 具体任务列表

- [x] P0-DB-01 使用 `better-sqlite3` 定义题库只读连接模块，路径来自环境变量或配置。
- [x] P0-DB-02 定义 `app.sqlite` Drizzle schema：`users`、`quiz_sessions`、`quiz_session_questions`、`answer_records`、`user_question_stats`、`user_topic_stats`、`scope_parse_logs`。
- [x] P0-DB-03 生成并提交 Drizzle migration。
- [x] P0-DB-04 初始化 `app.sqlite` 时启用 WAL。
- [ ] P0-DB-05 实现题库查询：按 `exam_part = 科目A`、category、topic、url 查询候选题。
- [ ] P0-DB-06 实现题目详情查询：从 `question_details` 读取题干、选项、答案、解析、图片引用。
- [ ] P0-DB-07 实现 session 创建事务：写入 session 和 20 条 session questions。
- [ ] P0-DB-08 实现首次提交事务：校验状态、写 `answer_records`、更新 session summary、更新 question/topic stats。
- [ ] P0-DB-09 实现重复提交幂等读取：已提交时不写历史，返回首次结果。
- [ ] P1-DB-10 实现过期未提交 session 查询和 30 天后清理任务。
- [ ] P1-DB-11 实现 active wrong pool 统计更新：答错进入，连续答对 2 次移除。
- [ ] P1-DB-12 实现 weak topic 查询：正确率 `< 60%` 且答题数 `>= 3`。

## 推荐使用的成熟工具 / 库

- better-sqlite3
- Drizzle ORM
- Drizzle Kit
- nanoid

## 不建议自行开发的部分

- migration 管理
- SQL query builder
- token 随机数算法

## 可能涉及的文件或模块

- `src/db/app/schema.ts`
- `src/db/app/client.ts`
- `src/db/question-bank/client.ts`
- `src/db/question-bank/queries.ts`
- `src/db/app/repositories/*.ts`
- `drizzle.config.ts`
- `drizzle/`

## 测试方式

- 使用临时 SQLite 文件跑 migration。
- 使用 fixture session 测试首次提交事务。
- 测试重复提交不会新增 `answer_records`。
- 测试过期未提交 token 返回过期状态。

## 验收标准

- `app.sqlite` schema 可通过 migration 创建。
- 题库能读取 科目A 题目详情和图片 Markdown 路径。
- 首次提交事务具备原子性。
- 重复提交幂等。

## 未确认问题 / AI 假设

- 已确认：SQLite driver 使用 `better-sqlite3`。
- 已确认：token 使用 `nanoid` 默认安全随机字符串。
- 已确认：同等优先级选题内随机。
- 已确认：过期未提交 session 清理使用脚本，由 VPS cron 调用。
