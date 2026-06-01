/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from "vitest";

import {
  initializeTelegramBot,
  registerTelegramBotHandlers,
  type TelegramBotRegistrationTarget,
} from "./telegram-bot";

describe("registerTelegramBotHandlers", () => {
  it("registers commands and text scope handling", () => {
    const target = {
      command: vi.fn(),
      on: vi.fn(),
    };
    const handleTextMessage = vi.fn();

    registerTelegramBotHandlers(
      target as unknown as TelegramBotRegistrationTarget,
      { handleTextMessage }
    );

    expect(target.command).toHaveBeenCalledWith("start", expect.any(Function));
    expect(target.command).toHaveBeenCalledWith("help", expect.any(Function));
    expect(target.on).toHaveBeenCalledWith("message:text", handleTextMessage);
  });

  it("registers candidate callback handling", () => {
    const target = {
      command: vi.fn(),
      on: vi.fn(),
    };
    const handleCandidateCallback = vi.fn();

    registerTelegramBotHandlers(
      target as unknown as TelegramBotRegistrationTarget,
      { handleCandidateCallback }
    );

    expect(target.on).toHaveBeenCalledWith(
      "callback_query:data",
      handleCandidateCallback
    );
  });
});

describe("initializeTelegramBot", () => {
  it("initializes the grammY bot before webhook updates are handled", async () => {
    const bot = { init: vi.fn().mockResolvedValue(undefined) };

    await initializeTelegramBot(bot);

    expect(bot.init).toHaveBeenCalledTimes(1);
  });
});
