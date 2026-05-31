import { createTelegramWebhookServer } from "./server";
import { createTelegramBot } from "./telegram-bot";
import { readBotRuntimeEnv } from "./runtime-env";

const env = readBotRuntimeEnv();
const bot = createTelegramBot({ token: env.botToken });
const server = createTelegramWebhookServer({
  bot,
  headerSecret: env.headerSecret,
  pathPrefix: env.pathPrefix,
  pathSecret: env.pathSecret,
});

server.listen(env.port, env.host, () => {
  console.log(
    `Telegram webhook server listening on ${env.host}:${env.port}${env.pathPrefix}/${env.pathSecret}`
  );
});
