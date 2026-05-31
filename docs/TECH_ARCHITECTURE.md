# TECH_ARCHITECTURE: 技术架构

## 1. 总体架构

本项目采用 Telegram Bot 作为入口，Web 页面承载测试体验，Node/TypeScript 统一实现 Bot、Web/API、选题和数据访问。

```text
Telegram
  -> VPS 外部 Nginx + Certbot
  -> Docker edge Nginx
      /telegram/webhook -> bot container
      /quiz/*           -> web container
      /api/*            -> web container
      /assets/*         -> web container

Browser
  -> VPS 外部 Nginx + Certbot
  -> Docker edge Nginx
  -> web container
```

## 2. 技术栈

| 层 | 技术 | 状态 |
|---|---|---|
| Web 前端 | Next.js + React + TypeScript | 已确认 |
| Web/API | Next.js Route Handlers / API Routes | 已确认 |
| Telegram Bot | Node.js + TypeScript | 已确认 |
| 数据库 | SQLite | 已确认 |
| 配置 | YAML | 已确认 |
| AI Provider | OpenAI API | 已确认 |
| SQLite migration | Drizzle Kit / drizzle-orm migrations | 已确认 |
| 部署 | Docker Compose on VPS | 已确认 |
| 反向代理 | 外部 Nginx + Docker 内部 Nginx | 已确认 |

不采用 Python/FastAPI 作为主后端。

## 3. 容器划分

### `edge`

Docker 内部 Nginx，统一暴露一个宿主机端口。

职责：

- 接收外部 Nginx 转发来的 HTTP 请求。
- 按路径分发到 `web` 或 `bot`。
- 不处理 TLS。
- 不运行 Certbot。

端口通过 `.env` 配置：

```env
EDGE_HOST=127.0.0.1
EDGE_PORT=3100
```

### `web`

Next.js Web/API 服务。

职责：

- 提供 `/quiz/[token]` 页面。
- 提供 `/api/quiz/{token}`。
- 提供 `/api/quiz/{token}/submit`。
- 读取题库 SQLite。
- 写入 app SQLite。
- 渲染 Markdown 题干、选项、解析。
- 提供 `/assets/fe-siken/...` 静态资源。

### `bot`

Telegram webhook HTTP server。

职责：

- 监听 `/telegram/webhook/{pathSecret}`。
- 校验 URL path secret。
- 校验 `X-Telegram-Bot-Api-Secret-Token` header secret。
- 处理 Telegram update。
- 解析用户输入主题。
- 创建用户、session、token。
- 执行选题。
- 调用 Telegram API 回复测试链接。

## 4. 数据库

使用两个 SQLite 文件：

| 文件 | 用途 |
|---|---|
| `fe_siken_questions.sqlite` | 题库，只读或近似只读 |
| `app.sqlite` | 用户、session、answer、统计 |

题库当前状态：

- `questions`: 3438
- `question_details`: 3400
- `question_assets`: 1890
- 科目A详情覆盖：3400 / 3400
- 科目A含图片题：1115
- 科目B不属于 MVP

并发写入要求：

- `app.sqlite` 启用 WAL。
- 写操作使用事务。
- 首次提交和统计更新必须在同一事务中完成。
- 重复提交必须幂等。

## 5. 配置 YAML

配置文件用于维护：

- 高权重主题清单。
- 主题别名表。
- 标准主题映射。
- 低正确率主题阈值。
- 最近题目避重天数。
- 每次测试题量结构：15 指定范围题 + 5 补强题。
- OpenAI model 与解析参数。

配置由系统维护者修改，不开放给用户。MVP 中配置修改后通过重启服务生效，不做热加载。

建议 YAML 结构：

```yaml
quiz:
  total_questions: 20
  requested_scope_questions: 15
  reinforcement_questions: 5
  recent_question_avoid_days: 7
  unsubmitted_token_ttl_days: 7
  unsubmitted_session_purge_days: 30
  weak_topic:
    accuracy_threshold: 0.6
    min_answered: 3
  wrong_question:
    remove_after_consecutive_correct: 2

topics:
  high_weight_topics: []
  aliases: {}
  standard_topic_mappings: {}

ai:
  provider: openai
  model: gpt-4.1-mini
  temperature: 0
```

## 6. AI 职责

AI 只负责：

- 用户输入范围解析。
- 相近主题建议。
- AI Provider 使用 OpenAI API。
- MVP 推荐模型：`gpt-4.1-mini`。
- 模型名保存在 YAML 配置中，后续可替换。
- 范围解析使用低温度配置，优先返回结构化 JSON。

AI 不负责：

- 生成题目。
- 改写题干、选项或解析。
- 判断答案。
- 参与最终选题排序。
- 生成额外讲解。

解析顺序：

1. YAML 主题别名表。
2. `questions.category`。
3. `questions.topic`。
4. AI 兜底解析。

相近主题建议来源：

1. 优先从 YAML 标准主题和别名表中选择。
2. 不足 2-3 个时，从题库 `category` / `topic` 中补充。

## 7. 静态资源

图片不是 base64。题库文本中使用 Markdown 图片路径：

```md
![08.png/image-size:389×98](/assets/fe-siken/29_haru/q8/08.png)
```

部署时需要让 `/assets/fe-siken/...` 映射到本地图片目录。

生产目录建议：

```text
/opt/fe-quiz-bot/
  data/
    fe_siken_questions.sqlite
    app.sqlite
  config/
    app.yaml
  assets/
    fe-siken/
  backups/
```

## 8. 部署策略

- 独立 VPS。
- 外部 Nginx 负责 HTTPS、域名和 Certbot。
- Docker Compose 内包含 `edge`、`web`、`bot`。
- 外部 Nginx 只代理到 Docker 暴露的单一端口。
- `edge` 根据路径转发。

示例路由：

```text
/quiz/*            -> web
/api/*             -> web
/assets/*          -> web
/telegram/webhook  -> bot
/telegram/webhook/{pathSecret} -> bot
```

## 9. 备份策略

每天备份：

- `/opt/fe-quiz-bot/data/app.sqlite`
- `/opt/fe-quiz-bot/config/app.yaml`

保留：

- 最近 7 天。

不做每日备份：

- 题库 SQLite。
- assets 图片目录。

原因：

- 题库和 assets 可从部署包恢复。
- 用户答题记录和配置是运行期关键数据。

## 10. 建议目录结构

```text
project-root/
  app/
    quiz/[token]/
    api/quiz/[token]/
    api/quiz/[token]/submit/
  src/
    bot/
    config/
    db/
    quiz/
    telegram/
    ai/
    markdown/
  public/
    assets/fe-siken/
  config/
    app.yaml
  data/
    fe_siken_questions.sqlite
    app.sqlite
  deploy/
    docker-compose.yml
    nginx/
  docs/
```

## 11. token 生命周期

- 未提交 token 创建后 7 天有效。
- 超过 7 天仍未提交时，Web 页面显示过期提示，不允许提交。
- 过期未提交 session 保留到创建后第 30 天。
- 超过 30 天仍未提交时，由清理任务删除 session 和关联题目。
- 已提交 token 结果永久可访问。

## 12. migration 与限流

`app.sqlite` schema 使用 Drizzle Kit / drizzle-orm migrations 管理。

MVP 基础限流策略：

- Telegram webhook 主要依赖路径 secret 和 header secret 双校验，不做复杂用户级限流。
- `GET /api/quiz/{token}` 做轻量 IP 限流。
- `POST /api/quiz/{token}/submit` 做更严格的 IP + token 级限流。
- 重复提交仍必须由数据库状态和事务保证幂等，不能只依赖限流。

## 13. UI 设计边界

UI 组件库、视觉细节、具体布局和交互动效在 Open Design 阶段确认。当前技术文档只固定产品交互约束和响应式要求。

## 14. 待确认问题

- Open Design 输出后的 UI 组件库和页面细节。
- 生产日志格式和监控方案。
