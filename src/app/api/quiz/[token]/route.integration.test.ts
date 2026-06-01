/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it } from "vitest";

import {
  cleanupIntegrationFixtures,
  createMigratedAppDbFixture,
  createQuestionBankFixture,
} from "@/test/integration-fixtures";
import { createQuizSessionFromScopeMessage } from "@/bot/quiz-session-factory";
import { GET } from "./route";

const originalAppDbPath = process.env.APP_DB_PATH;
const originalQuestionDbPath = process.env.QUESTION_DB_PATH;

describe("GET /api/quiz/[token] integration", () => {
  afterEach(async () => {
    process.env.APP_DB_PATH = originalAppDbPath;
    process.env.QUESTION_DB_PATH = originalQuestionDbPath;
    await cleanupIntegrationFixtures();
  });

  it("returns an active 20-question quiz without leaking answers, explanations, or source URLs", async () => {
    const appDb = await createMigratedAppDbFixture({ seedUser: false });
    const questionDb = await createQuestionBankFixture({
      topic: "\u30c7\u30fc\u30bf\u30d9\u30fc\u30b9",
    });
    await createQuizSessionFromScopeMessage({
      appDb: appDb.db,
      matchedScope: {
        candidateMinorCategories: [],
        majorCategory: undefined,
        matchedCategories: [],
        matchedTopics: ["\u30c7\u30fc\u30bf\u30d9\u30fc\u30b9"],
        method: "alias",
        minorCategory: undefined,
        scopeType: "topic_keyword",
        status: "matched",
        suggestions: [],
      },
      nowIso: "2026-05-31T00:00:00.000Z",
      questionDb,
      rawScopeInput: "\u30c7\u30fc\u30bf\u30d9\u30fc\u30b9",
      telegramUser: { id: 12345, username: "taro_db" },
      tokenFactory: () => "token-active",
    });

    process.env.APP_DB_PATH = appDb.path;
    process.env.QUESTION_DB_PATH = questionDb.name;

    const response = await GET(
      new Request("https://example.test/api/quiz/token-active"),
      {
        params: { token: "token-active" },
      }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("active");
    expect(body.questions).toHaveLength(20);
    expect(body.questions[0]).toMatchObject({
      choices: [
        { label: "\u30a2", text: "\u9078\u629e\u80a2A" },
        { label: "\u30a4", text: "\u9078\u629e\u80a2B" },
      ],
      index: 1,
      questionText: "\u554f\u984c\u6587 1",
    });
    expect(body.questions[0]).not.toHaveProperty("correctAnswer");
    expect(body.questions[0]).not.toHaveProperty("explanation");
    expect(body.questions[0]).not.toHaveProperty("sourceUrl");
  });

  it("returns TOKEN_EXPIRED for an expired unsubmitted token", async () => {
    const appDb = await createMigratedAppDbFixture({ seedUser: false });
    const questionDb = await createQuestionBankFixture({
      topic: "\u30c7\u30fc\u30bf\u30d9\u30fc\u30b9",
    });
    await createQuizSessionFromScopeMessage({
      appDb: appDb.db,
      matchedScope: {
        candidateMinorCategories: [],
        majorCategory: undefined,
        matchedCategories: [],
        matchedTopics: ["\u30c7\u30fc\u30bf\u30d9\u30fc\u30b9"],
        method: "alias",
        minorCategory: undefined,
        scopeType: "topic_keyword",
        status: "matched",
        suggestions: [],
      },
      nowIso: "2000-01-01T00:00:00.000Z",
      questionDb,
      rawScopeInput: "\u30c7\u30fc\u30bf\u30d9\u30fc\u30b9",
      telegramUser: { id: 12345, username: "taro_db" },
      tokenFactory: () => "token-expired",
    });

    process.env.APP_DB_PATH = appDb.path;
    process.env.QUESTION_DB_PATH = questionDb.name;

    const response = await GET(
      new Request("https://example.test/api/quiz/token-expired"),
      {
        params: { token: "token-expired" },
      }
    );
    const body = await response.json();

    expect(response.status).toBe(410);
    expect(body).toEqual({
      error: {
        code: "TOKEN_EXPIRED",
        message: "Token expired.",
      },
    });
  });
});
