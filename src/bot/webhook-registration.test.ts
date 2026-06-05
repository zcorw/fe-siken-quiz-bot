/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from "vitest";

import { registerTelegramWebhook } from "./webhook-registration";

describe("registerTelegramWebhook", () => {
  it("registers the Telegram webhook with message and callback query updates", async () => {
    const setWebhook = vi.fn().mockResolvedValue(true);

    await registerTelegramWebhook({
      api: { setWebhook },
      headerSecret: "header-secret",
      pathPrefix: "/telegram/webhook",
      pathSecret: "path-secret",
      publicBaseUrl: "https://example.test/",
    });

    expect(setWebhook).toHaveBeenCalledWith(
      "https://example.test/telegram/webhook/path-secret",
      {
        allowed_updates: ["message", "callback_query"],
        secret_token: "header-secret",
      }
    );
  });
});
