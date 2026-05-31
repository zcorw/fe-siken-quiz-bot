/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from "vitest";

import {
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
});
