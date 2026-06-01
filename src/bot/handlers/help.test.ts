/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from "vitest";

import { HELP_MESSAGE, handleHelpCommand } from "./help";

describe("handleHelpCommand", () => {
  it("replies with Japanese help text", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);

    await handleHelpCommand({ reply });

    expect(reply).toHaveBeenCalledWith(HELP_MESSAGE);
    expect(HELP_MESSAGE).toContain("/start");
    expect(HELP_MESSAGE).toContain("/help");
    expect(HELP_MESSAGE).toContain("データベース");
    expect(HELP_MESSAGE).toContain("一度に1つ");
  });
});
