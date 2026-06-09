/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  answerRecords,
  userQuestionStats,
  userTopicStats,
} from "@/db/app/schema";
import { createQuizSessionFromScopeMessage } from "@/bot/quiz-session-factory";
import {
  cleanupIntegrationFixtures,
  createMigratedAppDbFixture,
  createQuestionBankFixture,
} from "@/test/integration-fixtures";
import { POST } from "./route";

const originalAppDbPath = process.env.APP_DB_PATH;
const originalQuestionDbPath = process.env.QUESTION_DB_PATH;

describe("POST /api/quiz/[token]/submit integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-31T01:30:00.000Z"));
  });

  afterEach(async () => {
    vi.useRealTimers();
    process.env.APP_DB_PATH = originalAppDbPath;
    process.env.QUESTION_DB_PATH = originalQuestionDbPath;
    await cleanupIntegrationFixtures();
  });

  it("writes answer records and user stats after first submit", async () => {
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
      tokenFactory: () => "token-submit",
    });

    process.env.APP_DB_PATH = appDb.path;
    process.env.QUESTION_DB_PATH = questionDb.name;

    const response = await POST(
      new Request("https://example.test/api/quiz/token-submit/submit", {
        body: JSON.stringify({
          answers: Array.from({ length: 20 }, (_, index) => ({
            questionIndex: index + 1,
            selectedAnswer: "\u30a2",
          })),
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
      { params: { token: "token-submit" } }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary).toEqual({
      totalQuestions: 20,
      correctCount: 20,
      incorrectCount: 0,
      accuracy: 1,
    });

    expect(await appDb.db.select().from(answerRecords)).toHaveLength(20);
    expect(await appDb.db.select().from(userQuestionStats)).toHaveLength(20);

    const topicStats = await appDb.db.select().from(userTopicStats);
    const databaseTopicStat = topicStats.find(
      (stat) =>
        stat.topicType === "topic" &&
        stat.topicKey === "\u30c7\u30fc\u30bf\u30d9\u30fc\u30b9"
    );
    expect(topicStats.length).toBeGreaterThan(0);
    expect(databaseTopicStat).toMatchObject({
      attemptCount: 20,
      correctCount: 20,
      incorrectCount: 0,
      topicKey: "\u30c7\u30fc\u30bf\u30d9\u30fc\u30b9",
      topicType: "topic",
    });
  });

  it("returns the first result on repeat submit without adding answer history", async () => {
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
      tokenFactory: () => "token-repeat-submit",
    });

    process.env.APP_DB_PATH = appDb.path;
    process.env.QUESTION_DB_PATH = questionDb.name;

    const firstResponse = await POST(
      new Request("https://example.test/api/quiz/token-repeat-submit/submit", {
        body: JSON.stringify({
          answers: Array.from({ length: 20 }, (_, index) => ({
            questionIndex: index + 1,
            selectedAnswer: "\u30a2",
          })),
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
      { params: { token: "token-repeat-submit" } }
    );
    const firstBody = await firstResponse.json();
    const answerRecordsAfterFirst = await appDb.db.select().from(answerRecords);

    const repeatedResponse = await POST(
      new Request("https://example.test/api/quiz/token-repeat-submit/submit", {
        body: JSON.stringify({ answers: [] }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
      { params: { token: "token-repeat-submit" } }
    );
    const repeatedBody = await repeatedResponse.json();

    expect(repeatedResponse.status).toBe(200);
    expect(repeatedBody).toEqual(firstBody);
    expect(answerRecordsAfterFirst).toHaveLength(20);
    expect(await appDb.db.select().from(answerRecords)).toHaveLength(20);
  });
});
