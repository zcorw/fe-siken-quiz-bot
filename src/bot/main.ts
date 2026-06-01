import { createOpenAIScopeClient, parseScope } from "@/ai/scope-parser";
import { loadAppConfig } from "@/config/app-config";
import { openAppDb } from "@/db/app/client";
import { openQuestionBank } from "@/db/question-bank/client";
import { listQuestionBankKeywords } from "@/db/question-bank/queries";

import { handleScopeMessage } from "./handlers/scope-message";
import { loadRuntimeEnvFile } from "./load-runtime-env-file";
import { createQuizSessionFromScopeMessage } from "./quiz-session-factory";
import { createTelegramWebhookServer } from "./server";
import { createTelegramBot, initializeTelegramBot } from "./telegram-bot";
import { readBotRuntimeEnv } from "./runtime-env";

async function start(): Promise<void> {
  loadRuntimeEnvFile();
  const env = readBotRuntimeEnv();
  const appConfig = await loadAppConfig(env.appConfigPath);
  const appDb = openAppDb();
  const questionDb = openQuestionBank();
  const questionBankKeywords = listQuestionBankKeywords(questionDb);
  const openAiClient = createOpenAIScopeClient(env.openAiApiKey);
  const availableScope = {
    categories: questionBankKeywords.categories,
    standardTopics: appConfig.topics.standard_topics,
    topics: questionBankKeywords.topics,
  };

  const bot = createTelegramBot({
    token: env.botToken,
    handleTextMessage: (ctx) =>
      handleScopeMessage({
        ctx,
        createQuizSession: (input) =>
          createQuizSessionFromScopeMessage({
            ...input,
            appDb: appDb.db,
            nowIso: new Date().toISOString(),
            questionDb,
          }),
        logScopeParse: async ({ rawScopeInput, result }) => {
          console.log(
            JSON.stringify({
              event: "telegram.scope_parse",
              rawScopeInput,
              result,
            })
          );
        },
        logger: console,
        parseScope: (input) =>
          parseScope({
            aiConfig: appConfig.ai,
            availableScope,
            client: openAiClient,
            input,
            questionBankKeywords,
            topicsConfig: appConfig.topics,
          }),
        publicBaseUrl: env.publicBaseUrl,
      }),
  });

  const server = createTelegramWebhookServer({
    bot,
    headerSecret: env.headerSecret,
    logger: console,
    pathPrefix: env.pathPrefix,
    pathSecret: env.pathSecret,
  });

  await initializeTelegramBot(bot);

  server.listen(env.port, env.host, () => {
    console.log(
      `Telegram webhook server listening on ${env.host}:${env.port}${env.pathPrefix}/${env.pathSecret}`
    );
  });
}

start().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
