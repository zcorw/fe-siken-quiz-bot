/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from "vitest";

import { handleScopeMessage } from "./scope-message";

describe("handleScopeMessage", () => {
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
});
