import { Bot } from "grammy";
import { handleStartCommand } from "./handlers/start";

export interface CreateTelegramBotOptions {
  token: string;
}

export function createTelegramBot({ token }: CreateTelegramBotOptions): Bot {
  const bot = new Bot(token);
  bot.command("start", handleStartCommand);
  return bot;
}
