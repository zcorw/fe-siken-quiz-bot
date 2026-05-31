# 00 Project Overview TodoList

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement these files task-by-task. Use `superpowers:test-driven-development` for implementation tasks, `superpowers:systematic-debugging` for failures, and `superpowers:verification-before-completion` before claiming completion.

## 目标

把 Telegram 入口 + Web 作答 + SQLite 题库 + 用户历史统计 + Docker VPS 部署拆分为可连续推进的 MVP 开发任务。

## 依赖任务

- 无。此文件是总览。

## 具体任务列表

- [x] P0-OV-01 阅读 `docs/todolist/01_FOUNDATION.md` 到 `10_RELEASE_CHECKLIST.md`，确认执行顺序。
- [x] P0-OV-02 每次开始开发前检查当前 git 状态，避免覆盖用户已有改动。
- [x] P0-OV-03 每个任务执行完成后运行对应验证命令，并记录结果。
- [x] P0-OV-04 每个阶段完成后更新对应 TodoList checkbox。
- [x] P1-OV-05 前后端接口对接前，对照 `docs/API_SPEC.md` 和 Figma 结果页结构做一次字段完整性检查。
- [ ] P1-OV-06 Docker 部署前，对照 `docs/TECH_ARCHITECTURE.md` 检查路径、端口、secret、volume。

## 已确认技术与产品决策

- 包管理器使用 `pnpm`。
- UI 使用 `shadcn/ui + Radix UI + Tailwind CSS`。
- Telegram Bot 使用 `grammY`。
- SQLite driver 使用 `better-sqlite3`。
- Next.js API 使用 Node.js runtime，不使用 Edge runtime。
- 响应式断点：`< 1024px` 使用移动端布局，`>= 1024px` 使用 PC 布局。
- UI design tokens 以当前 Figma 高保真稿为准。
- Markdown 渲染使用 `react-markdown + rehype-sanitize`。
- 图片加载失败时显示 alt / 文件名占位，并保留题目文本。
- 未提交答案按 token 保存到 `localStorage`，提交成功后清除。
- 已提交 token 再次打开时允许只读切换题目详情。
- 移动端结果页默认展示错题，提供 `すべての解説を表示`。
- PC 结果页左侧按 1-20 原顺序展示全部题号和正误状态。
- 同等优先级选题内随机。
- token 使用 `nanoid` 默认安全随机字符串。
- API 限流默认值：GET 每 IP 60/min，POST 每 IP 10/min + 每 token 3/min。
- Telegram webhook path secret 错误返回 404，header secret 错误返回 403。
- Bot 日文 MVP 文案由开发时先写，后续可统一审核。
- OpenAI 范围解析无匹配时返回相近主题建议；无建议时提示重新输入。
- OpenAI API 失败且本地匹配失败时，不创建测试，提示稍后重试。
- YAML 配置不热加载，重启生效。
- 生产日志使用 JSON log。
- MVP 不接入 Sentry，只使用日志。
- 过期未提交 session 清理使用脚本，由 VPS cron 调用。
- 备份使用脚本，由 VPS cron 调用。
- Docker 使用 `web` 和 `bot` 各自 Dockerfile。
- 生产部署目录为 `/opt/fe-quiz-bot/`。
- 外部 Nginx 域名部署时再替换，文档中使用占位值。
- MVP 不需要 GitHub Actions。
- 开发任务加入 Playwright 截图与 Figma 视觉对照检查。

## 推荐使用的成熟工具 / 库

- Next.js + React + TypeScript
- Tailwind CSS + shadcn/ui + Radix UI
- React Hook Form + Zod
- Drizzle ORM + Drizzle Kit
- grammY
- OpenAI official SDK
- markdown-it 或 react-markdown + rehype-sanitize
- Vitest, Supertest, Playwright
- Docker Compose, Nginx

## 不建议自行开发的部分

- Telegram Bot update 解析
- Markdown/HTML sanitizer
- migration 框架
- 表单校验和 API schema 校验
- E2E 浏览器自动化
- Docker 反代逻辑

## 可能涉及的文件或模块

- `app/`
- `src/bot/`
- `src/config/`
- `src/db/`
- `src/quiz/`
- `src/ai/`
- `src/markdown/`
- `deploy/`
- `docs/todolist/`

## 测试方式

- 每个阶段使用该阶段文件内的验证方式。
- 最终以 `10_RELEASE_CHECKLIST.md` 为准做总验收。

## 验收标准

- 所有 TodoList 文件存在。
- 每个文件都包含目标、依赖、任务、工具建议、测试方式、验收标准、未确认问题 / AI 假设。
- 任务能按依赖顺序推进到前后端接口对接完成和 Docker 部署准备完成。

## 未确认问题 / AI 假设

- AI 假设：项目会从空工程或近似空工程开始搭建。
- 已确认：Figma 设计稿最终以当前高保真状态为前端实现准绳。
- 已确认：生产部署目录为 `/opt/fe-quiz-bot/`。
- 已确认：外部 Nginx 域名部署时再替换。
- 未确认：VPS 登录用户、实际域名、实际 `EDGE_PORT`。
