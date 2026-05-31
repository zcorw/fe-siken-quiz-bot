/**
 * @vitest-environment node
 */
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";

import { quizSessionQuestions, quizSessions, users } from "@/db/app/schema";
import {
  cleanupIntegrationFixtures,
  createMigratedAppDbFixture,
  createQuestionBankFixture,
} from "@/test/integration-fixtures";
import { createQuizSessionFromScopeMessage } from "../quiz-session-factory";
import { handleScopeMessage } from "./scope-message";

describe("scope message integration", () => {
  afterEach(async () => {
    await cleanupIntegrationFixtures();
  });

  it("creates a Telegram user, quiz session, 20 questions, and token URL for a matched topic", async () => {
    const appDb = await createMigratedAppDbFixture({ seedUser: false });
    const questionDb = await createQuestionBankFixture({
      topic: "\u30c7\u30fc\u30bf\u30d9\u30fc\u30b9",
    });
    const reply = vi.fn().mockResolvedValue(undefined);

    await handleScopeMessage({
      ctx: {
        from: {
          id: 12345,
          first_name: "Taro",
          last_name: "Yamada",
          username: "taro_db",
        },
        message: { text: "\u30c7\u30fc\u30bf\u30d9\u30fc\u30b9" },
        reply,
      },
      parseScope: vi.fn().mockResolvedValue({
        matchedCategories: [],
        matchedTopics: ["\u30c7\u30fc\u30bf\u30d9\u30fc\u30b9"],
        method: "alias",
        status: "matched",
        suggestions: [],
      }),
      createQuizSession: (input) =>
        createQuizSessionFromScopeMessage({
          ...input,
          appDb: appDb.db,
          nowIso: "2026-05-31T00:00:00.000Z",
          questionDb,
          sessionIdFactory: () => "session-integration",
          tokenFactory: () => "token-integration",
        }),
      publicBaseUrl: "https://example.test",
    });

    const [user] = await appDb.db
      .select()
      .from(users)
      .where(eq(users.telegramUserId, "12345"));
    expect(user).toMatchObject({
      telegramUsername: "taro_db",
      telegramFirstName: "Taro",
      telegramLastName: "Yamada",
    });

    const [session] = await appDb.db
      .select()
      .from(quizSessions)
      .where(eq(quizSessions.token, "token-integration"));
    expect(session).toMatchObject({
      id: "session-integration",
      rawScopeInput: "\u30c7\u30fc\u30bf\u30d9\u30fc\u30b9",
      status: "created",
      totalQuestions: 20,
      userId: user?.id,
    });

    const questions = await appDb.db
      .select()
      .from(quizSessionQuestions)
      .where(eq(quizSessionQuestions.quizSessionId, "session-integration"))
      .orderBy(quizSessionQuestions.questionIndex);
    expect(questions).toHaveLength(20);
    expect(questions[0]).toMatchObject({
      questionIndex: 1,
      questionUrl: "https://example.test/q1.html",
      sourceTopic: "\u30c7\u30fc\u30bf\u30d9\u30fc\u30b9",
    });
    expect(questions[19]?.questionIndex).toBe(20);

    expect(reply).toHaveBeenCalledWith(
      "\u6f14\u7fd2\u3092\u4f5c\u6210\u3057\u307e\u3057\u305f\u3002\nhttps://example.test/quiz/token-integration"
    );
  });
});
