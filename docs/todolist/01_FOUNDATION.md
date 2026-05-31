# 01 Foundation TodoList

## 目标

搭建 Next.js + TypeScript 单仓工程基础、代码质量工具、共享配置读取、测试框架和目录结构。

## 依赖任务

- `00_PROJECT_OVERVIEW.md`

## 具体任务列表

- [x] P0-FD-01 初始化 Next.js + TypeScript 项目，采用 App Router。
- [x] P0-FD-02 配置 ESLint、Prettier、TypeScript strict mode。
- [x] P0-FD-03 安装并配置 Vitest、Testing Library、Playwright。
- [x] P0-FD-04 建立目录：`src/config`、`src/db`、`src/quiz`、`src/bot`、`src/ai`、`src/markdown`、`src/lib`。
- [x] P0-FD-05 创建 `config/app.yaml` 示例文件，覆盖 quiz、topics、ai、telegram、deployment 基础字段。
- [x] P0-FD-06 使用成熟 YAML parser 读取配置，使用 Zod 校验配置结构。
- [x] P0-FD-07 创建 `.env.example`，包含数据库路径、OpenAI key、Telegram token、webhook secrets、public base URL、edge port。
- [x] P0-FD-08 添加 `pnpm` scripts：`dev`、`test`、`test:e2e`、`lint`、`typecheck`、`db:generate`、`db:migrate`。
- [ ] P1-FD-09 建立统一错误类型和 API response helper。
- [ ] P1-FD-10 建立基础日志封装，先使用 `pino`，不接入复杂监控。

## 推荐使用的成熟工具 / 库

- Next.js, React, TypeScript
- Zod
- yaml
- Vitest, Playwright
- pino

## 不建议自行开发的部分

- YAML parser
- schema validation
- logger
- test runner

## 可能涉及的文件或模块

- `package.json`
- `next.config.ts`
- `tsconfig.json`
- `vitest.config.ts`
- `playwright.config.ts`
- `src/config/app-config.ts`
- `src/config/schema.ts`
- `config/app.yaml`
- `.env.example`

## 测试方式

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- 配置读取单元测试：缺字段时报错，默认示例配置可通过。

## 验收标准

- 本地能启动 Next.js。
- 配置文件能被读取和 Zod 校验。
- 测试、lint、typecheck 命令可运行。
- 不包含业务实现代码。

## 未确认问题 / AI 假设

- 已确认：包管理器使用 `pnpm`。
- 已确认：YAML 配置不热加载，修改后重启服务生效。
- 已确认：生产日志使用 JSON log。
- 已确认：MVP 不需要 GitHub Actions。
