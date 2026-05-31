# 10 Release Checklist TodoList

## 目标

在 MVP 发布前完成质量、功能、安全、部署和回滚检查。

## 依赖任务

- `01_FOUNDATION.md`
- `02_DATABASE.md`
- `03_BACKEND_API.md`
- `04_TELEGRAM_BOT.md`
- `05_FRONTEND_QUIZ.md`
- `06_RESULT_AND_HISTORY.md`
- `07_AI_SCOPE_PARSING.md`
- `08_INTEGRATION_TESTING.md`
- `09_DOCKER_DEPLOYMENT.md`

## 具体任务列表

- [x] P0-RC-01 `pnpm typecheck` 通过。
- [x] P0-RC-02 `pnpm lint` 通过。
- [x] P0-RC-03 `pnpm test` 通过。
- [x] P0-RC-04 `pnpm test:e2e` 通过。
- [x] P0-RC-05 migration 可在空 `app.sqlite` 上执行。
- [x] P0-RC-06 `GET /api/quiz/{token}` active 不返回答案、解析、URL。
- [x] P0-RC-07 `POST /api/quiz/{token}/submit` 首次提交写历史。
- [x] P0-RC-08 重复提交不更新历史。
- [x] P0-RC-09 移动端和 PC 端结果页均展示原题、全部选项、用户答案、正确答案、解析、URL。
- [ ] P0-RC-10 Telegram webhook secret 校验通过。
- [ ] P0-RC-11 Docker Compose 可 build 和启动。
- [ ] P0-RC-12 外部 Nginx 示例配置已写入文档。
- [ ] P1-RC-13 备份脚本可手动运行并生成备份。
- [ ] P1-RC-14 token 过期和 invalid token 页面日文提示正确。
- [ ] P1-RC-15 OpenAI 不可用时 Bot 有可理解的日文错误消息。
- [ ] P1-RC-16 Playwright 截图与当前 Figma 高保真稿关键布局一致。

## 推荐使用的成熟工具 / 库

- pnpm scripts
- Vitest
- Playwright
- Docker Compose
- curl

## 不建议自行开发的部分

- 自定义 release runner
- 手写浏览器验证脚本替代 Playwright

## 可能涉及的文件或模块

- 全项目
- `docs/deployment.md`
- `deploy/`

## 测试方式

- 按任务列表逐项执行。
- 使用 `superpowers:verification-before-completion` 汇总证据。

## 验收标准

- MVP 主流程可从 Telegram 创建 token，到 Web 答题提交，再到结果页查看。
- Docker 部署任务具备可执行配置和说明。
- 未确认项已在最终交付中明确列出。

## 未确认问题 / AI 假设

- AI 假设：发布前至少进行一次真实 VPS smoke test。
- 已确认：MVP 不接入 Sentry，只使用 JSON log。
- 已确认：MVP 不需要 GitHub Actions。
