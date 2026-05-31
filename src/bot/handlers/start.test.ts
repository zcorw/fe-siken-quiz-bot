/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from "vitest";

import { START_MESSAGE, handleStartCommand } from "./start";

describe("handleStartCommand", () => {
  it("replies with a Japanese welcome message", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);

    await handleStartCommand({ reply });

    expect(reply).toHaveBeenCalledWith(START_MESSAGE);
    expect(START_MESSAGE).toContain("基本情報技術者試験");
    expect(START_MESSAGE).toContain("練習したい分野");
  });
});
