/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from "vitest";

import type { ApiErrorCode } from "@/lib/api-response";

async function setupRouteMocks(errorCode: ApiErrorCode, status: number) {
  vi.resetModules();
  const { ApiError } = await import("@/lib/api-response");
  const close = vi.fn();

  vi.doMock("@/db/app/client", () => ({
    openAppDb: () => ({ db: {}, close }),
  }));
  vi.doMock("@/db/question-bank/client", () => ({
    openQuestionBank: () => ({ close }),
  }));
  vi.doMock("@/lib/rate-limit", () => ({
    consumeRateLimit: vi.fn(),
    createMemoryRateLimiter: () => ({}),
    getClientIp: () => "127.0.0.1",
  }));
  vi.doMock("@/quiz/quiz-service", () => ({
    loadQuizByToken: vi
      .fn()
      .mockRejectedValue(
        new ApiError(errorCode, status, `${errorCode} message`)
      ),
  }));
  vi.doMock("@/quiz/submit-service", () => ({
    submitQuizByToken: vi
      .fn()
      .mockRejectedValue(
        new ApiError(errorCode, status, `${errorCode} message`)
      ),
  }));
}

describe("quiz API route error responses", () => {
  it.each([
    ["INVALID_TOKEN", 404],
    ["TOKEN_EXPIRED", 410],
    ["QUIZ_LOAD_FAILED", 500],
    ["RATE_LIMITED", 429],
  ] satisfies Array<[ApiErrorCode, number]>)(
    "maps GET errors for %s",
    async (code, status) => {
      await setupRouteMocks(code, status);
      const { GET } = await import("./route");

      const response = await GET(new Request("https://example.test"), {
        params: { token: "token-1" },
      });

      expect(response.status).toBe(status);
      await expect(response.json()).resolves.toEqual({
        error: {
          code,
          message: `${code} message`,
        },
      });
    }
  );

  it.each([
    ["INCOMPLETE_ANSWERS", 422],
    ["INVALID_ANSWER", 422],
    ["QUESTION_NOT_IN_SESSION", 422],
    ["SUBMIT_FAILED", 500],
    ["RATE_LIMITED", 429],
  ] satisfies Array<[ApiErrorCode, number]>)(
    "maps POST errors for %s",
    async (code, status) => {
      await setupRouteMocks(code, status);
      const { POST } = await import("./submit/route");

      const response = await POST(
        new Request("https://example.test", {
          method: "POST",
          body: JSON.stringify({ answers: [] }),
        }),
        { params: { token: "token-1" } }
      );

      expect(response.status).toBe(status);
      await expect(response.json()).resolves.toEqual({
        error: {
          code,
          message: `${code} message`,
        },
      });
    }
  );
});
