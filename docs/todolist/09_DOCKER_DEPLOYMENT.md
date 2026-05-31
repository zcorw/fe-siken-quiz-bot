# 09 Docker Deployment TodoList

## 目标

完成 Docker Compose 部署：`web`、`bot`、`edge`，并提供 VPS 外部 Nginx + Certbot 反代说明和备份策略。

## 依赖任务

- `01_FOUNDATION.md`
- `03_BACKEND_API.md`
- `04_TELEGRAM_BOT.md`
- `08_INTEGRATION_TESTING.md`

## 具体任务列表

- [x] P0-DP-01 创建独立 `Dockerfile.web`，构建 Next.js standalone 或 production server。
- [ ] P0-DP-02 创建独立 `Dockerfile.bot`，构建 Telegram webhook server。
- [ ] P0-DP-03 创建 `deploy/nginx/edge.conf`，按路径转发 `/quiz`、`/api`、`/assets` 到 web，`/telegram/webhook` 到 bot。
- [ ] P0-DP-04 创建 `deploy/docker-compose.yml`，包含 `edge`、`web`、`bot`。
- [ ] P0-DP-05 将 `EDGE_HOST`、`EDGE_PORT`、数据路径、配置路径、secret 通过 env 配置。
- [ ] P0-DP-06 配置 volume：`data/`、`config/`、`assets/`。
- [ ] P0-DP-07 编写外部 VPS Nginx 示例，只代理到 Docker edge 单端口，不在 Docker 内处理 Certbot；域名使用占位值，部署时替换。
- [ ] P0-DP-08 编写 Telegram webhook 设置命令说明，包含 secret token。
- [ ] P1-DP-09 编写备份脚本：每日由 VPS cron 备份 `app.sqlite` 和 `config/app.yaml`，保留 7 天。
- [ ] P1-DP-10 编写部署 smoke test：访问 `/quiz/invalid-token`、检查 webhook secret 拒绝。

## 推荐使用的成熟工具 / 库

- Docker Compose
- Nginx
- Certbot 由 VPS 外部已有 Nginx 管理
- bash/sh 脚本或 host cron

## 不建议自行开发的部分

- 自定义反向代理
- 自建证书续期逻辑
- Docker 内重复运行 Certbot

## 可能涉及的文件或模块

- `Dockerfile.web`
- `Dockerfile.bot`
- `deploy/docker-compose.yml`
- `deploy/nginx/edge.conf`
- `deploy/nginx/external-vps-example.conf`
- `deploy/scripts/backup-app-data.sh`
- `docs/deployment.md`

## 测试方式

- `docker compose config`
- `docker compose up --build`
- curl edge port：`/api/quiz/not-exist`
- curl webhook 无 secret 应拒绝。
- 检查 volume 中 `app.sqlite` 和 assets 路径挂载。

## 验收标准

- 外部只暴露一个 Docker edge 端口。
- HTTPS 和 Certbot 由 VPS 外部 Nginx 管理。
- web 和 bot 容器职责分离。
- assets 能通过 `/assets/fe-siken/...` 访问。

## 未确认问题 / AI 假设

- 已确认：生产部署目录为 `/opt/fe-quiz-bot/`。
- 已确认：备份使用脚本，由 VPS cron 调用。
- 已确认：Docker 使用 `web` 和 `bot` 各自 Dockerfile。
- 已确认：外部 Nginx 域名部署时再替换，文档中使用占位值。
- 未确认：实际 `server_name`、VPS 登录用户、实际 `EDGE_PORT`。
