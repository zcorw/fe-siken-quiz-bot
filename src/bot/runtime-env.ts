type BotRuntimeEnvSource = Readonly<Record<string, string | undefined>>;

export interface BotRuntimeEnv {
  appConfigPath: string;
  autoSetWebhook: boolean;
  botLogFile?: string;
  botToken: string;
  headerSecret: string;
  host: string;
  openAiApiKey: string;
  pathPrefix: string;
  pathSecret: string;
  port: number;
  publicBaseUrl: string;
}

export function readBotRuntimeEnv(
  env: BotRuntimeEnvSource = process.env
): BotRuntimeEnv {
  return {
    appConfigPath: requiredEnv(env, "APP_CONFIG_PATH"),
    autoSetWebhook: parseBooleanFlag(env.TELEGRAM_AUTO_SET_WEBHOOK),
    botLogFile: optionalEnv(env, "BOT_LOG_FILE"),
    botToken: requiredEnv(env, "TELEGRAM_BOT_TOKEN"),
    headerSecret: requiredEnv(
      env,
      "TELEGRAM_WEBHOOK_HEADER_SECRET",
      "TELEGRAM_WEBHOOK_SECRET_TOKEN"
    ),
    host: env.BOT_HOST?.trim() || "0.0.0.0",
    openAiApiKey: requiredEnv(env, "OPENAI_API_KEY"),
    pathPrefix: env.TELEGRAM_WEBHOOK_PATH_PREFIX?.trim() || "/telegram/webhook",
    pathSecret: requiredEnv(env, "TELEGRAM_WEBHOOK_PATH_SECRET"),
    port: parsePort(env.BOT_PORT),
    publicBaseUrl: requiredEnv(env, "PUBLIC_BASE_URL"),
  };
}

function parseBooleanFlag(value: string | undefined): boolean {
  if (value === undefined || value.trim() === "") {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }

  throw new Error("TELEGRAM_AUTO_SET_WEBHOOK must be true or false.");
}

function optionalEnv(
  env: BotRuntimeEnvSource,
  name: string
): string | undefined {
  const value = env[name]?.trim();

  return value === "" ? undefined : value;
}

function requiredEnv(
  env: BotRuntimeEnvSource,
  name: string,
  fallbackName?: string
): string {
  const value = env[name]?.trim() || env[fallbackName ?? ""]?.trim();

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function parsePort(value: string | undefined): number {
  if (value === undefined || value.trim() === "") {
    return 3001;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("BOT_PORT must be a valid TCP port.");
  }

  return port;
}
