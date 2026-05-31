import { Bot } from "grammy";

export interface CreateTelegramBotOptions {
  token: string;
}

export function createTelegramBot({ token }: CreateTelegramBotOptions): Bot {
  return new Bot(token);
}
