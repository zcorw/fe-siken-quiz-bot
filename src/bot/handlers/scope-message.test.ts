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

  it("ignores commands so only /start and /help command handlers process them", async () => {
    const parseScope = vi.fn();

    await handleScopeMessage({
      ctx: { message: { text: "/start" }, reply: vi.fn() },
      parseScope,
    });

    expect(parseScope).not.toHaveBeenCalled();
  });
});
