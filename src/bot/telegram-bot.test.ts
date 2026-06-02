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

  it("ignores commands in group chats when the bot is not mentioned", async () => {
    const target = {
      command: vi.fn(),
      on: vi.fn(),
    };

    registerTelegramBotHandlers(
      target as unknown as TelegramBotRegistrationTarget,
      {}
    );

    const startHandler = target.command.mock.calls.find(
      ([command]) => command === "start"
    )?.[1] as (ctx: unknown) => Promise<void>;
    const reply = vi.fn();

    await startHandler({
      chat: { type: "group" },
      me: { username: "fe_quiz_bot" },
      message: { text: "/start" },
      reply,
    });

    expect(reply).not.toHaveBeenCalled();
  });

  it("handles commands in group chats when the bot is mentioned", async () => {
    const target = {
      command: vi.fn(),
      on: vi.fn(),
    };

    registerTelegramBotHandlers(
      target as unknown as TelegramBotRegistrationTarget,
      {}
    );

    const helpHandler = target.command.mock.calls.find(
      ([command]) => command === "help"
    )?.[1] as (ctx: unknown) => Promise<void>;
    const reply = vi.fn();

    await helpHandler({
      chat: { type: "supergroup" },
      me: { username: "fe_quiz_bot" },
      message: { text: "/help@fe_quiz_bot" },
      reply,
    });

    expect(reply).toHaveBeenCalledTimes(1);
  });
});

describe("initializeTelegramBot", () => {
  it("initializes the grammY bot before webhook updates are handled", async () => {
    const bot = { init: vi.fn().mockResolvedValue(undefined) };

    await initializeTelegramBot(bot);

    expect(bot.init).toHaveBeenCalledTimes(1);
  });
});
