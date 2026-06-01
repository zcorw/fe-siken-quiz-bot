import { InlineKeyboard } from "grammy";

import { resolveNoMatchAction, type ScopeParseResult } from "@/quiz/scope-match";
import type { ReplyContext } from "./start";

export interface ScopeMessageContext extends ReplyContext {
  from?: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
  message?: {
    text?: string;
  };
}

export type ScopeParseFunction = (input: string) => Promise<ScopeParseResult>;
export type CreateQuizSessionFunction = (input: {
  rawScopeInput: string;
  matchedScope: ScopeParseResult;
  telegramUser?: {
    id: number;
    username?: string;
    firstName?: string;
    lastName?: string;
  };
}) => Promise<{ token: string }>;
export type LogScopeParseFunction = (input: {
  rawScopeInput: string;
  result: ScopeParseResult;
}) => Promise<unknown>;

export interface BotLogger {
  error(payload: unknown, message: string): void;
}

export interface HandleScopeMessageOptions {
  ctx: ScopeMessageContext;
  parseScope: ScopeParseFunction;
  createQuizSession?: CreateQuizSessionFunction;
  publicBaseUrl?: string;
  logScopeParse?: LogScopeParseFunction;
  logger?: BotLogger;
}

export async function handleScopeMessage({
  ctx,
  parseScope,
  createQuizSession,
  publicBaseUrl,
  logScopeParse,
  logger,
}: HandleScopeMessageOptions): Promise<void> {
  const text = ctx.message?.text?.trim();

  if (!text || text.startsWith("/")) {
    return;
  }

  let result: ScopeParseResult;

  try {
    result = await parseScope(text);
    await logScopeParse?.({ rawScopeInput: text, result });
  } catch (error) {
    logger?.error({ error }, "Bot scope handling failed");
    await ctx.reply(
      "処理中にエラーが発生しました。少し時間をおいて再度お試しください。"
    );
    return;
  }

  if (result.status === "matched") {
    const session = await createQuizSession?.({
      matchedScope: result,
      rawScopeInput: text,
      telegramUser:
        ctx.from === undefined
          ? undefined
          : {
              id: ctx.from.id,
              firstName: ctx.from.first_name,
              lastName: ctx.from.last_name,
              username: ctx.from.username,
            },
    });

    if (session !== undefined && publicBaseUrl !== undefined) {
      const quizUrl = `${publicBaseUrl.replace(/\/$/, "")}/quiz/${session.token}`;

      await ctx.reply("演習を作成しました。", {
        reply_markup: new InlineKeyboard().url("問題を開く", quizUrl),
      });
    }
    return;
  }

  if (
    result.status === "no_match" ||
    result.status === "needs_single_scope" ||
    result.status === "ai_unavailable"
  ) {
    const action = resolveNoMatchAction(result);

    if (action.type === "suggestions") {
      await ctx.reply(
        `分野を特定できませんでした。近い候補: ${action.suggestions.join("、")}`
      );
      return;
    }

    await ctx.reply(
      result.status === "needs_single_scope"
        ? action.message
        : `分野を特定できませんでした。${action.message}`
    );
  }
}
