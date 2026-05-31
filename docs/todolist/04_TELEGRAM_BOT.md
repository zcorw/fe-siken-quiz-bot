# 04 Telegram Bot TodoList

## 目标

实现 Telegram webhook bot：`/start`、`/help`、范围输入、创建 quiz token、发送 Web 链接。

## 依赖任务

- `01_FOUNDATION.md`
- `02_DATABASE.md`
- `07_AI_SCOPE_PARSING.md`

## 具体任务列表

- [x] P0-BOT-01 安装并配置 `grammY`。
- [x] P0-BOT-02 实现 webhook HTTP server，监听 `/telegram/webhook/{pathSecret}`。
- [ ] P0-BOT-03 校验 path secret 和 `X-Telegram-Bot-Api-Secret-Token`；path secret 错误返回 404，header secret 错误返回 403。
- [ ] P0-BOT-04 实现 `/start` 日文欢迎消息。
- [ ] P0-BOT-05 实现 `/help` 日文帮助消息。
- [ ] P0-BOT-06 实现普通文本输入处理：调用 scope parse。
- [ ] P0-BOT-07 无匹配时返回 2-3 个相近主题建议，不创建 session。
- [ ] P0-BOT-08 匹配成功时创建或更新 Telegram user。
- [ ] P0-BOT-09 调用选题服务创建 20 题 session/token。
- [ ] P0-BOT-10 返回 `/quiz/{token}` 链接。
- [ ] P1-BOT-11 记录 scope parse log 和 bot 错误日志。
- [ ] P1-BOT-12 编写 webhook tests：secret 失败、start/help、文本成功、文本无匹配。

## 推荐使用的成熟工具 / 库

- grammY
- Zod
- pino
- Vitest

## 不建议自行开发的部分

- Telegram update parser
- Telegram API client
- webhook secret header 读取之外的 bot 协议处理

## 可能涉及的文件或模块

- `src/bot/server.ts`
- `src/bot/telegram-bot.ts`
- `src/bot/messages.ts`
- `src/bot/handlers/start.ts`
- `src/bot/handlers/help.ts`
- `src/bot/handlers/scope-message.ts`
- `src/telegram/webhook-auth.ts`

## 测试方式

- 模拟 Telegram update JSON。
- header/path secret 缺失时返回 403 或 404。
- `/start` 和 `/help` 不创建 session。
- 普通主题输入成功后写入 session 并返回 URL。

## 验收标准

- Bot 只支持 `/start`、`/help` 和普通文本范围输入。
- Bot 不在 Telegram 内逐题答题。
- 所有 Bot 文案为日文。
- token 绑定创建它的 Telegram user。

## 未确认问题 / AI 假设

- 已确认：使用 `grammY`。
- 已确认：Bot 日文 MVP 文案由开发时先写，后续可统一审核。
- 已确认：Telegram webhook path secret 错误返回 404，header secret 错误返回 403。
