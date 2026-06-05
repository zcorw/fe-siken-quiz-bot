import { createOpenAIScopeClient, parseScope } from "@/ai/scope-parser";
import { loadAppConfig } from "@/config/app-config";
import { getMajorCategories, getMinorToMajorCategoryMap } from "@/config/schema";
import { openAppDb } from "@/db/app/client";
import { openQuestionBank } from "@/db/question-bank/client";
import { listQuestionBankKeywords } from "@/db/question-bank/queries";
import { createRuntimeLogger } from "@/lib/logger";

import {
  handleScopeCandidateCallback,
  handleScopeMessage,
} from "./handlers/scope-message";
import { loadRuntimeEnvFile } from "./load-runtime-env-file";
import { createQuizSessionFromScopeMessage } from "./quiz-session-factory";
import { createTelegramWebhookServer } from "./server";
import { createTelegramBot, initializeTelegramBot } from "./telegram-bot";
import { readBotRuntimeEnv } from "./runtime-env";
import { registerTelegramWebhook } from "./webhook-registration";

async function start(): Promise<void> {
  loadRuntimeEnvFile();
  const env = readBotRuntimeEnv();
  const botLogger = createRuntimeLogger({
    bindings: { component: "telegram-bot" },
    logFilePath: env.botLogFile,
  });
  const appConfig = await loadAppConfig(env.appConfigPath);
  const appDb = openAppDb();
  const questionDb = openQuestionBank();
  const questionBankKeywords = listQuestionBankKeywords(questionDb);
  const openAiClient = createOpenAIScopeClient(env.openAiApiKey);
  const availableScope = {
    majorCategories: getMajorCategories(appConfig.topics),
    minorCategories: Array.from(
      getMinorToMajorCategoryMap(appConfig.topics),
      ([minorCategory, majorCategory]) => ({ majorCategory, minorCategory })
    ),
    topics: questionBankKeywords.topics,
  };

  const bot = createTelegramBot({
    token: env.botToken,
    handleCandidateCallback: (ctx) =>
      handleScopeCandidateCallback({
        ctx,
        createQuizSession: (input) =>
          createQuizSessionFromScopeMessage({
            ...input,
            appDb: appDb.db,
            nowIso: new Date().toISOString(),
            questionDb,
            topicsConfig: appConfig.topics,
          }),
        logger: botLogger,
        publicBaseUrl: env.publicBaseUrl,
        topicsConfig: appConfig.topics,
      }),
    handleTextMessage: (ctx) =>
      handleScopeMessage({
        ctx,
        createQuizSession: (input) =>
          createQuizSessionFromScopeMessage({
            ...input,
            appDb: appDb.db,
            nowIso: new Date().toISOString(),
            questionDb,
            topicsConfig: appConfig.topics,
          }),
        logScopeParse: async ({ rawScopeInput, result }) => {
          botLogger.info(
            {
              event: "telegram.scope_parse",
              rawScopeInput,
              result,
            },
            "Telegram scope parse completed"
          );
        },
        logger: botLogger,
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
        topicsConfig: appConfig.topics,
      }),
  });

  const server = createTelegramWebhookServer({
    bot,
    headerSecret: env.headerSecret,
    logger: botLogger,
    pathPrefix: env.pathPrefix,
    pathSecret: env.pathSecret,
  });

  await initializeTelegramBot(bot);

  server.listen(env.port, env.host, () => {
    botLogger.info(
      {
        host: env.host,
        pathPrefix: env.pathPrefix,
        port: env.port,
      },
      "Telegram webhook server listening"
    );

    if (env.autoSetWebhook) {
      registerTelegramWebhook({
        api: bot.api,
        headerSecret: env.headerSecret,
        pathPrefix: env.pathPrefix,
        pathSecret: env.pathSecret,
        publicBaseUrl: env.publicBaseUrl,
      })
        .then(() => {
          botLogger.info(
            { allowedUpdates: ["message", "callback_query"] },
            "Telegram webhook registered"
          );
        })
        .catch((error: unknown) => {
          botLogger.error({ error }, "Telegram webhook registration failed");
        });
    }
  });
}

start().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
