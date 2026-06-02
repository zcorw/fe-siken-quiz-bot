/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from "vitest";

import {
  buildCandidateScopeCallbackData,
  handleScopeCandidateCallback,
  handleScopeMessage,
  resolveScopeMessageTriggerText,
} from "./scope-message";

const topicsConfig = {
  aliases: {},
  category_tree: {
    "マルチメディア・組込みシステム": ["ユーザーインタフェース技術"],
    ネットワーク: ["通信プロトコル"],
  },
  high_weight_topics: ["ネットワーク"],
};

describe("handleScopeMessage", () => {
  it("ignores group text messages that do not mention the bot", async () => {
    const parseScope = vi.fn();

    await handleScopeMessage({
      ctx: {
        chat: { type: "group" },
        me: { username: "fe_quiz_bot" },
        message: { text: "データベース" },
        reply: vi.fn(),
      },
      parseScope,
    });

    expect(parseScope).not.toHaveBeenCalled();
  });

  it("parses group text messages that mention the bot", async () => {
    const parseScope = vi.fn().mockResolvedValue({
      matchedCategories: [],
      matchedTopics: ["データベース"],
      method: "alias",
      status: "matched",
      suggestions: [],
    });

    await handleScopeMessage({
      ctx: {
        chat: { type: "supergroup" },
        me: { username: "fe_quiz_bot" },
        message: { text: "@fe_quiz_bot データベース" },
        reply: vi.fn(),
      },
      parseScope,
    });

    expect(parseScope).toHaveBeenCalledWith("データベース");
  });

  it("keeps private text messages triggerable without mentioning the bot", async () => {
    expect(
      resolveScopeMessageTriggerText({
        botUsername: "fe_quiz_bot",
        chatType: "private",
        text: "データベース",
      })
    ).toBe("データベース");
  });

  it("requires a mention in group text messages and strips it before parsing", async () => {
    expect(
      resolveScopeMessageTriggerText({
        botUsername: "fe_quiz_bot",
        chatType: "group",
        text: "ネットワーク @fe_quiz_bot",
      })
    ).toBe("ネットワーク");
  });

  it("calls scope parsing for regular text messages", async () => {
    const parseScope = vi.fn().mockResolvedValue({
      matchedCategories: [],
      matchedTopics: ["データベース"],
      method: "alias",
      status: "matched",
      suggestions: [],
    });
    const reply = vi.fn().mockResolvedValue(undefined);

    await handleScopeMessage({
      ctx: { message: { text: "数据库" }, reply },
      parseScope,
    });

    expect(parseScope).toHaveBeenCalledWith("数据库");
  });

  it("calls quiz session creation when scope parsing matches", async () => {
    const parseResult = {
      matchedCategories: [],
      matchedTopics: ["データベース"],
      method: "alias",
      status: "matched" as const,
      suggestions: [],
    };
    const parseScope = vi.fn().mockResolvedValue(parseResult);
    const createQuizSession = vi.fn().mockResolvedValue({ token: "token-1" });

    await handleScopeMessage({
      ctx: { message: { text: "数据库" }, reply: vi.fn() },
      parseScope,
      createQuizSession,
    });

    expect(createQuizSession).toHaveBeenCalledWith({
      matchedScope: parseResult,
      rawScopeInput: "数据库",
    });
  });

  it("replies with a Telegram URL button after session creation", async () => {
    const parseScope = vi.fn().mockResolvedValue({
      matchedCategories: [],
      matchedTopics: ["データベース"],
      method: "alias",
      status: "matched",
      suggestions: [],
    });
    const createQuizSession = vi.fn().mockResolvedValue({ token: "token-1" });
    const reply = vi.fn().mockResolvedValue(undefined);

    await handleScopeMessage({
      ctx: { message: { text: "数据库" }, reply },
      parseScope,
      createQuizSession,
      publicBaseUrl: "https://example.test",
    });

    expect(reply).toHaveBeenCalledWith(
      "演習を作成しました。",
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: [
            [
              {
                text: "問題を開く",
                url: "https://example.test/quiz/token-1",
              },
            ],
          ],
        }),
      })
    );
  });

  it("records the scope parse result after parsing", async () => {
    const parseResult = {
      matchedCategories: [],
      matchedTopics: ["データベース"],
      method: "alias",
      status: "matched" as const,
      suggestions: [],
    };
    const logScopeParse = vi.fn().mockResolvedValue(undefined);

    await handleScopeMessage({
      ctx: { message: { text: "数据库" }, reply: vi.fn() },
      parseScope: vi.fn().mockResolvedValue(parseResult),
      createQuizSession: vi.fn().mockResolvedValue({ token: "token-1" }),
      logScopeParse,
    });

    expect(logScopeParse).toHaveBeenCalledWith({
      rawScopeInput: "数据库",
      result: parseResult,
    });
  });

  it("logs bot errors and replies with a generic failure message", async () => {
    const logger = { error: vi.fn() };
    const reply = vi.fn().mockResolvedValue(undefined);
    const error = new Error("parse failed");

    await handleScopeMessage({
      ctx: { message: { text: "数据库" }, reply },
      parseScope: vi.fn().mockRejectedValue(error),
      logger,
    });

    expect(logger.error).toHaveBeenCalledWith(
      { error },
      "Bot scope handling failed"
    );
    expect(reply).toHaveBeenCalledWith(
      "処理中にエラーが発生しました。少し時間をおいて再度お試しください。"
    );
  });

  it("ignores commands so only /start and /help command handlers process them", async () => {
    const parseScope = vi.fn();

    await handleScopeMessage({
      ctx: { message: { text: "/start" }, reply: vi.fn() },
      parseScope,
    });

    expect(parseScope).not.toHaveBeenCalled();
  });

  it("replies with suggestions when scope parsing returns no_match suggestions", async () => {
    const parseScope = vi.fn().mockResolvedValue({
      matchedCategories: [],
      matchedTopics: [],
      method: "none",
      status: "no_match",
      suggestions: ["データベース", "ネットワーク"],
    });
    const reply = vi.fn().mockResolvedValue(undefined);

    await handleScopeMessage({
      ctx: { message: { text: "データベス" }, reply },
      parseScope,
    });

    expect(reply).toHaveBeenCalledWith(
      "分野を特定できませんでした。近い候補: データベース、ネットワーク"
    );
  });

  it("shows OpenAI candidate scopes as Telegram callback buttons without creating a quiz session", async () => {
    const parseScope = vi.fn().mockResolvedValue({
      candidateMinorCategories: [],
      candidateScopes: [
        {
          majorCategory: "database",
          name: "database",
          scopeType: "major_category",
        },
        {
          majorCategory: "network",
          name: "tcp/ip",
          scopeType: "minor_category",
        },
      ],
      majorCategory: undefined,
      matchedCategories: [],
      matchedTopics: [],
      method: "openai",
      minorCategory: undefined,
      scopeType: "no_match",
      status: "no_match",
      suggestions: ["database", "tcp/ip"],
    });
    const createQuizSession = vi.fn();
    const reply = vi.fn().mockResolvedValue(undefined);

    await handleScopeMessage({
      ctx: { message: { text: "unknown" }, reply },
      parseScope,
      createQuizSession,
    });

    expect(createQuizSession).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("近い候補"),
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: [
            [
              {
                callback_data: "scope_candidate:M:database",
                text: "database",
              },
            ],
            [
              {
                callback_data: "scope_candidate:m:tcp%2Fip",
                text: "tcp/ip",
              },
            ],
          ],
        }),
      })
    );
  });

  it("builds short candidate callback data for configured Japanese categories", () => {
    const callbackData = buildCandidateScopeCallbackData(
      {
        name: "ユーザーインタフェース技術",
        scopeType: "minor_category",
      },
      topicsConfig
    );

    expect(Buffer.byteLength(callbackData, "utf8")).toBeLessThanOrEqual(64);
    expect(callbackData).toBe("scope_candidate:m:0");
  });

  it("creates a quiz from a selected candidate callback", async () => {
    const createQuizSession = vi.fn().mockResolvedValue({ token: "token-1" });
    const reply = vi.fn().mockResolvedValue(undefined);
    const answerCallbackQuery = vi.fn().mockResolvedValue(undefined);

    await handleScopeCandidateCallback({
      createQuizSession,
      ctx: {
        answerCallbackQuery,
        callbackQuery: {
          data: "scope_candidate:m:0",
        },
        from: {
          id: 123,
          first_name: "Taro",
          last_name: "Yamada",
          username: "taro",
        },
        reply,
      },
      publicBaseUrl: "https://example.test",
      topicsConfig,
    });

    expect(createQuizSession).toHaveBeenCalledWith({
      matchedScope: expect.objectContaining({
        candidateMinorCategories: ["ユーザーインタフェース技術"],
        majorCategory: "マルチメディア・組込みシステム",
        matchedCategories: ["ユーザーインタフェース技術"],
        minorCategory: "ユーザーインタフェース技術",
        scopeType: "minor_category",
        status: "matched",
      }),
      rawScopeInput: "ユーザーインタフェース技術",
      telegramUser: {
        firstName: "Taro",
        id: 123,
        lastName: "Yamada",
        username: "taro",
      },
    });
    expect(answerCallbackQuery).toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith(
      "演習を作成しました。",
      expect.any(Object)
    );
  });

  it("replies with suggestions when AI fallback is unavailable", async () => {
    const parseScope = vi.fn().mockResolvedValue({
      matchedCategories: [],
      matchedTopics: [],
      method: "openai_unavailable",
      status: "ai_unavailable",
      suggestions: ["\u30c7\u30fc\u30bf\u30d9\u30fc\u30b9"],
    });
    const reply = vi.fn().mockResolvedValue(undefined);

    await handleScopeMessage({
      ctx: { message: { text: "databese" }, reply },
      parseScope,
    });

    expect(reply).toHaveBeenCalledWith(
      "\u5206\u91ce\u3092\u7279\u5b9a\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002\u8fd1\u3044\u5019\u88dc: \u30c7\u30fc\u30bf\u30d9\u30fc\u30b9"
    );
  });

  it("asks the user to retry when no suggestions are available", async () => {
    const parseScope = vi.fn().mockResolvedValue({
      matchedCategories: [],
      matchedTopics: [],
      method: "none",
      status: "no_match",
      suggestions: [],
    });
    const reply = vi.fn().mockResolvedValue(undefined);

    await handleScopeMessage({
      ctx: { message: { text: "unknown" }, reply },
      parseScope,
    });

    expect(reply).toHaveBeenCalledWith(
      "分野を特定できませんでした。練習したい分野を入力し直してください。"
    );
  });

  it("asks the user to enter one scope when multiple scopes are detected", async () => {
    const parseScope = vi.fn().mockResolvedValue({
      candidateMinorCategories: [],
      majorCategory: undefined,
      matchedCategories: [],
      matchedTopics: [],
      method: "local_multi_scope",
      minorCategory: undefined,
      scopeType: "no_match",
      status: "needs_single_scope",
      suggestions: [],
    });
    const reply = vi.fn().mockResolvedValue(undefined);

    await handleScopeMessage({
      ctx: { message: { text: "ネットワークとデータベース" }, reply },
      parseScope,
    });

    expect(reply).toHaveBeenCalledWith(
      "練習範囲は1つだけ入力してください。"
    );
  });
});
