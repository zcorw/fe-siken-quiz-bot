import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";

export interface TelegramWebhookBot {
  handleUpdate(update: unknown): Promise<void>;
}

export interface TelegramWebhookLogger {
  error(payload: unknown, message: string): void;
}

export interface CreateTelegramWebhookServerOptions {
  bot: TelegramWebhookBot;
  pathPrefix: string;
  pathSecret: string;
  headerSecret: string;
  logger?: TelegramWebhookLogger;
}

export function createTelegramWebhookServer({
  bot,
  pathPrefix,
  pathSecret,
  headerSecret,
  logger,
}: CreateTelegramWebhookServerOptions): Server {
  return createServer(async (request, response) => {
    try {
      if (
        request.method !== "POST" ||
        request.url !== `${pathPrefix}/${pathSecret}`
      ) {
        writeJson(response, 404, { ok: false });
        return;
      }

      if (request.headers["x-telegram-bot-api-secret-token"] !== headerSecret) {
        writeJson(response, 403, { ok: false });
        return;
      }

      await bot.handleUpdate(JSON.parse(await readBody(request)) as unknown);
      writeJson(response, 200, { ok: true });
    } catch (error) {
      logger?.error({ error }, "Telegram webhook handling failed");
      writeJson(response, 500, { ok: false });
    }
  });
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";

    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      body += chunk;
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function writeJson(
  response: ServerResponse,
  statusCode: number,
  body: unknown
): void {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(body));
}
