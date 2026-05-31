/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import { readBotRuntimeEnv } from "./runtime-env";

describe("readBotRuntimeEnv", () => {
  it("reads Telegram webhook server settings from environment variables", () => {
    expect(
      readBotRuntimeEnv({
        BOT_HOST: "127.0.0.1",
        BOT_PORT: "3901",
        TELEGRAM_BOT_TOKEN: "123:test-token",
        TELEGRAM_WEBHOOK_HEADER_SECRET: "header-secret",
        TELEGRAM_WEBHOOK_PATH_PREFIX: "/telegram/webhook",
        TELEGRAM_WEBHOOK_PATH_SECRET: "path-secret",
      })
    ).toEqual({
      botToken: "123:test-token",
      headerSecret: "header-secret",
      host: "127.0.0.1",
      pathPrefix: "/telegram/webhook",
      pathSecret: "path-secret",
      port: 3901,
    });
  });

  it("uses Docker-friendly defaults for host, port, and path prefix", () => {
    expect(
      readBotRuntimeEnv({
        TELEGRAM_BOT_TOKEN: "123:test-token",
        TELEGRAM_WEBHOOK_HEADER_SECRET: "header-secret",
        TELEGRAM_WEBHOOK_PATH_SECRET: "path-secret",
      })
    ).toMatchObject({
      host: "0.0.0.0",
      pathPrefix: "/telegram/webhook",
      port: 3001,
    });
  });

  it("rejects missing required secrets", () => {
    expect(() => readBotRuntimeEnv({})).toThrow(
      "TELEGRAM_BOT_TOKEN is required"
    );
  });
});
