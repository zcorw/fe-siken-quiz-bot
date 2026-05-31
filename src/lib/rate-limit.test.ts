/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import {
  consumeRateLimit,
  createMemoryRateLimiter,
  getClientIp,
} from "./rate-limit";

describe("rate-limit", () => {
  it("allows requests until the configured point budget is exhausted", async () => {
    const limiter = createMemoryRateLimiter({ points: 2, durationSeconds: 60 });

    await expect(
      consumeRateLimit(limiter, "ip:127.0.0.1")
    ).resolves.toBeUndefined();
    await expect(
      consumeRateLimit(limiter, "ip:127.0.0.1")
    ).resolves.toBeUndefined();
    await expect(
      consumeRateLimit(limiter, "ip:127.0.0.1")
    ).rejects.toMatchObject({
      code: "RATE_LIMITED",
      status: 429,
    });
  });

  it("reads the first forwarded IP address", () => {
    const request = new Request("https://example.test", {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
    });

    expect(getClientIp(request)).toBe("203.0.113.1");
  });
});
