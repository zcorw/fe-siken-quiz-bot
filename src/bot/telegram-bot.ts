import { Bot } from "grammy";
import { handleHelpCommand } from "./handlers/help";
import type {
  ScopeCandidateCallbackContext,
  ScopeMessageContext,
} from "./handlers/scope-message";
import { resolveScopeMessageTriggerText } from "./handlers/scope-message";
import { handleStartCommand } from "./handlers/start";

export type TelegramTextMessageHandler = (
  ctx: ScopeMessageContext
) => Promise<void> | void;
export type TelegramCandidateCallbackHandler = (
  ctx: ScopeCandidateCallbackContext
) => Promise<void> | void;

export interface CreateTelegramBotOptions {
  token: string;
  handleTextMessage?: TelegramTextMessageHandler;
  handleCandidateCallback?: TelegramCandidateCallbackHandler;
}

export interface RegisterTelegramBotHandlersOptions {
  handleTextMessage?: TelegramTextMessageHandler;
  handleCandidateCallback?: TelegramCandidateCallbackHandler;
}

export type TelegramBotRegistrationTarget = Pick<Bot, "command" | "on">;
export type TelegramBotInitializer = Pick<Bot, "init">;

type TelegramCommandContext = ScopeMessageContext;

export function registerTelegramBotHandlers(
  bot: TelegramBotRegistrationTarget,
  {
    handleCandidateCallback,
    handleTextMessage,
  }: RegisterTelegramBotHandlersOptions = {}
): void {
  bot.command("start", onlyWhenAddressed(handleStartCommand));
  bot.command("help", onlyWhenAddressed(handleHelpCommand));

  if (handleTextMessage !== undefined) {
    bot.on("message:text", handleTextMessage);
  }

  if (handleCandidateCallback !== undefined) {
    bot.on("callback_query:data", handleCandidateCallback);
  }
}

function onlyWhenAddressed(
  handler: (ctx: TelegramCommandContext) => Promise<void> | void
): (ctx: TelegramCommandContext) => Promise<void> | void {
  return (ctx) => {
    const triggerText = resolveScopeMessageTriggerText({
      botUsername: ctx.me?.username,
      chatType: ctx.chat?.type,
      text: ctx.message?.text,
    });

    if (triggerText === undefined) {
      return;
    }

    return handler(ctx);
  };
}

export function createTelegramBot({
  handleCandidateCallback,
  handleTextMessage,
  token,
}: CreateTelegramBotOptions): Bot {
  const bot = new Bot(token);
  registerTelegramBotHandlers(bot, {
    handleCandidateCallback,
    handleTextMessage,
  });
  return bot;
}

export async function initializeTelegramBot(
  bot: TelegramBotInitializer
): Promise<void> {
  await bot.init();
}
