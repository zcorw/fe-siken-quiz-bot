import { Bot } from "grammy";
import { handleHelpCommand } from "./handlers/help";
import type { ScopeMessageContext } from "./handlers/scope-message";
import { handleStartCommand } from "./handlers/start";

export type TelegramTextMessageHandler = (
  ctx: ScopeMessageContext
) => Promise<void> | void;

export interface CreateTelegramBotOptions {
  token: string;
  handleTextMessage?: TelegramTextMessageHandler;
}

export interface RegisterTelegramBotHandlersOptions {
  handleTextMessage?: TelegramTextMessageHandler;
}

export type TelegramBotRegistrationTarget = Pick<Bot, "command" | "on">;
export type TelegramBotInitializer = Pick<Bot, "init">;

export function registerTelegramBotHandlers(
  bot: TelegramBotRegistrationTarget,
  { handleTextMessage }: RegisterTelegramBotHandlersOptions = {}
): void {
  bot.command("start", handleStartCommand);
  bot.command("help", handleHelpCommand);

  if (handleTextMessage !== undefined) {
    bot.on("message:text", handleTextMessage);
  }
}

export function createTelegramBot({
  handleTextMessage,
  token,
}: CreateTelegramBotOptions): Bot {
  const bot = new Bot(token);
  registerTelegramBotHandlers(bot, { handleTextMessage });
  return bot;
}

export async function initializeTelegramBot(
  bot: TelegramBotInitializer
): Promise<void> {
  await bot.init();
}
