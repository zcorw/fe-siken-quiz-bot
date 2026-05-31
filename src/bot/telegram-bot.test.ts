/**
 * @vitest-environment node
 */
import { Bot } from "grammy";
import { describe, expect, it } from "vitest";

import { createTelegramBot } from "./telegram-bot";

describe("createTelegramBot", () => {
  it("creates a grammY bot with the configured token", () => {
    const bot = createTelegramBot({ token: "123:test-token" });

    expect(bot).toBeInstanceOf(Bot);
    expect(bot.token).toBe("123:test-token");
  });
});
