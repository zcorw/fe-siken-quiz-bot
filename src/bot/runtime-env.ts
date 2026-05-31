type BotRuntimeEnvSource = Readonly<Record<string, string | undefined>>;

export interface BotRuntimeEnv {
  botToken: string;
  headerSecret: string;
  host: string;
  pathPrefix: string;
  pathSecret: string;
  port: number;
}

export function readBotRuntimeEnv(
  env: BotRuntimeEnvSource = process.env
): BotRuntimeEnv {
  return {
    botToken: requiredEnv(env, "TELEGRAM_BOT_TOKEN"),
    headerSecret: requiredEnv(
      env,
      "TELEGRAM_WEBHOOK_HEADER_SECRET",
      "TELEGRAM_WEBHOOK_SECRET_TOKEN"
    ),
    host: env.BOT_HOST?.trim() || "0.0.0.0",
    pathPrefix: env.TELEGRAM_WEBHOOK_PATH_PREFIX?.trim() || "/telegram/webhook",
    pathSecret: requiredEnv(env, "TELEGRAM_WEBHOOK_PATH_SECRET"),
    port: parsePort(env.BOT_PORT),
  };
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
