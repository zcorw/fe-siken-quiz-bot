import { InlineKeyboard } from "grammy";

import {
  getMajorCategories,
  getMinorToMajorCategoryMap,
  type AppConfig,
} from "@/config/schema";
import { resolveNoMatchAction, type ScopeParseResult } from "@/quiz/scope-match";
import type { ReplyContext } from "./start";

const SCOPE_CANDIDATE_CALLBACK_PREFIX = "scope_candidate";

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

export interface ScopeCandidateCallbackContext extends ReplyContext {
  answerCallbackQuery?: () => Promise<unknown> | unknown;
  callbackQuery?: {
    data?: string;
  };
  from?: ScopeMessageContext["from"];
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
  topicsConfig?: AppConfig["topics"];
}

export async function handleScopeMessage({
  ctx,
  parseScope,
  createQuizSession,
  publicBaseUrl,
  logScopeParse,
  logger,
  topicsConfig,
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
      if (
        result.candidateScopes !== undefined &&
        result.candidateScopes.length > 0
      ) {
        await ctx.reply(
          `分野を特定できませんでした。近い候補: ${action.suggestions.join("、")}`,
          {
            reply_markup: buildCandidateScopeKeyboard(
              result.candidateScopes,
              topicsConfig
            ),
          }
        );
        return;
      }

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

export interface CandidateScopeButtonPayload {
  scopeType: "major_category" | "minor_category";
  name: string;
}

export interface HandleScopeCandidateCallbackOptions {
  ctx: ScopeCandidateCallbackContext;
  createQuizSession: CreateQuizSessionFunction;
  publicBaseUrl?: string;
  topicsConfig: AppConfig["topics"];
}

export function buildCandidateScopeCallbackData(
  { scopeType, name }: CandidateScopeButtonPayload,
  topicsConfig?: AppConfig["topics"]
): string {
  const scopeTypeToken = scopeType === "major_category" ? "M" : "m";
  const categoryIndex =
    topicsConfig === undefined
      ? undefined
      : findCategoryIndex({ name, scopeType, topicsConfig });
  const value =
    categoryIndex === undefined ? encodeURIComponent(name) : String(categoryIndex);

  return `${SCOPE_CANDIDATE_CALLBACK_PREFIX}:${scopeTypeToken}:${value}`;
}

export async function handleScopeCandidateCallback({
  ctx,
  createQuizSession,
  publicBaseUrl,
  topicsConfig,
}: HandleScopeCandidateCallbackOptions): Promise<void> {
  const candidate = parseCandidateScopeCallbackData(
    ctx.callbackQuery?.data,
    topicsConfig
  );

  await ctx.answerCallbackQuery?.();

  if (candidate === undefined) {
    await ctx.reply("候補を確認できませんでした。もう一度入力してください。");
    return;
  }

  const matchedScope: ScopeParseResult =
    candidate.scopeType === "major_category"
      ? {
          candidateMinorCategories:
            topicsConfig.category_tree[candidate.name] ?? [],
          majorCategory: candidate.name,
          matchedCategories: [],
          matchedTopics: [],
          method: "local_exact",
          minorCategory: undefined,
          scopeType: "major_category",
          status: "matched",
          suggestions: [],
        }
      : {
          candidateMinorCategories: [candidate.name],
          majorCategory: candidate.majorCategory,
          matchedCategories: [candidate.name],
          matchedTopics: [],
          method: "local_exact",
          minorCategory: candidate.name,
          scopeType: "minor_category",
          status: "matched",
          suggestions: [],
        };

  const session = await createQuizSession({
    matchedScope,
    rawScopeInput: candidate.name,
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

  if (publicBaseUrl !== undefined) {
    const quizUrl = `${publicBaseUrl.replace(/\/$/, "")}/quiz/${session.token}`;

    await ctx.reply("演習を作成しました。", {
      reply_markup: new InlineKeyboard().url("問題を開く", quizUrl),
    });
  }
}

function buildCandidateScopeKeyboard(
  candidateScopes: NonNullable<ScopeParseResult["candidateScopes"]>,
  topicsConfig?: AppConfig["topics"]
): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  candidateScopes.forEach((candidateScope, index) => {
    if (index > 0) {
      keyboard.row();
    }

    keyboard.text(
      candidateScope.name,
      buildCandidateScopeCallbackData(
        {
          name: candidateScope.name,
          scopeType: candidateScope.scopeType,
        },
        topicsConfig
      )
    );
  });

  return keyboard;
}

function findCategoryIndex({
  name,
  scopeType,
  topicsConfig,
}: CandidateScopeButtonPayload & {
  topicsConfig: AppConfig["topics"];
}): number | undefined {
  const categories =
    scopeType === "major_category"
      ? getMajorCategories(topicsConfig)
      : Array.from(getMinorToMajorCategoryMap(topicsConfig).keys());
  const index = categories.indexOf(name);

  return index === -1 ? undefined : index;
}

function parseCandidateScopeCallbackData(
  data: string | undefined,
  topicsConfig: AppConfig["topics"]
):
  | {
      majorCategory: string;
      name: string;
      scopeType: "major_category" | "minor_category";
    }
  | undefined {
  if (data === undefined) {
    return undefined;
  }

  const [prefix, scopeTypeToken, rawValue] = data.split(":");
  if (
    prefix !== SCOPE_CANDIDATE_CALLBACK_PREFIX ||
    rawValue === undefined ||
    (scopeTypeToken !== "M" && scopeTypeToken !== "m")
  ) {
    return undefined;
  }

  const scopeType =
    scopeTypeToken === "M" ? "major_category" : "minor_category";
  const categoryName = resolveCategoryNameFromCallbackValue({
    rawValue,
    scopeType,
    topicsConfig,
  });

  if (categoryName === undefined) {
    return undefined;
  }

  if (scopeType === "major_category") {
    return {
      majorCategory: categoryName,
      name: categoryName,
      scopeType,
    };
  }

  const majorCategory = getMinorToMajorCategoryMap(topicsConfig).get(
    categoryName
  );

  if (majorCategory === undefined) {
    return undefined;
  }

  return {
    majorCategory,
    name: categoryName,
    scopeType,
  };
}

function resolveCategoryNameFromCallbackValue({
  rawValue,
  scopeType,
  topicsConfig,
}: {
  rawValue: string;
  scopeType: "major_category" | "minor_category";
  topicsConfig: AppConfig["topics"];
}): string | undefined {
  const categories =
    scopeType === "major_category"
      ? getMajorCategories(topicsConfig)
      : Array.from(getMinorToMajorCategoryMap(topicsConfig).keys());
  const index = Number(rawValue);

  if (Number.isInteger(index) && index >= 0 && index < categories.length) {
    return categories[index];
  }

  try {
    const decodedName = decodeURIComponent(rawValue);
    return categories.includes(decodedName) ? decodedName : undefined;
  } catch {
    return undefined;
  }
}
