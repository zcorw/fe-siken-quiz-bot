# Telegram Webhook Setup

Replace placeholders before running on the VPS:

- `example.com`: deployment domain
- `$TELEGRAM_BOT_TOKEN`: real Telegram bot token
- `$TELEGRAM_WEBHOOK_PATH_SECRET`: random path secret used in `/telegram/webhook/{secret}`
- `$TELEGRAM_WEBHOOK_SECRET_TOKEN`: random header secret checked by the bot container

Set webhook:

Production deployments can register this automatically when
`TELEGRAM_AUTO_SET_WEBHOOK=true` is present in `/opt/fe-quiz-bot/.env`.
Use the manual command below for local debugging, verification, or one-off
repairs.

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "content-type: application/json" \
  -d "{
    \"url\": \"https://example.com/telegram/webhook/${TELEGRAM_WEBHOOK_PATH_SECRET}\",
    \"secret_token\": \"${TELEGRAM_WEBHOOK_SECRET_TOKEN}\",
    \"allowed_updates\": [\"message\", \"callback_query\"]
  }"
```

Check webhook:

```bash
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

Remove webhook:

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook"
```
