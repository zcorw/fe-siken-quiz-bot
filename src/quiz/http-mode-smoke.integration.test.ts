/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it } from "vitest";

import { createQuizSessionFromScopeMessage } from "@/bot/quiz-session-factory";
import { createQuestionBankProvider } from "@/db/question-bank/provider-factory";
import {
  cleanupIntegrationFixtures,
  createMigratedAppDbFixture,
} from "@/test/integration-fixtures";

import { loadQuizByToken } from "./quiz-service";
import { submitQuizByToken } from "./submit-service";

const runSmoke = process.env.RUN_QUESTION_BANK_HTTP_SMOKE === "1";
const describeHttpSmoke = runSmoke ? describe : describe.skip;

describeHttpSmoke("HTTP question bank mode smoke", () => {
  afterEach(async () => {
    await cleanupIntegrationFixtures();
  });

  it("creates, loads, and submits a quiz without Telegram", async () => {
    const serviceUrl =
      process.env.QUESTION_BANK_SERVICE_URL ?? "http://127.0.0.1:8124";
    const appDb = await createMigratedAppDbFixture({ seedUser: false });
    const questionBankProvider = createQuestionBankProvider({
      env: {
        QUESTION_BANK_MODE: "http",
        QUESTION_BANK_SERVICE_URL: serviceUrl,
      },
    });

    const { token } = await createQuizSessionFromScopeMessage({
      appDb: appDb.db,
      matchedScope: {
        candidateMinorCategories: [],
        matchedCategories: [],
        matchedTopics: [],
        method: "local_exact",
        scopeType: "topic_keyword",
        status: "matched",
        suggestions: [],
      },
      nowIso: "2026-05-31T01:00:00.000Z",
      questionBankProvider,
      rawScopeInput: "http-smoke-all-candidates",
      selectionSeedFactory: () => "http-smoke-seed",
      sessionIdFactory: () => "session-http-smoke",
      telegramUser: { id: 777000, username: "http_smoke" },
      tokenFactory: () => "token-http-smoke",
      topicsConfig: {
        aliases: {},
        category_tree: {},
        high_weight_topics: [],
      },
    });

    const activeResponse = await loadQuizByToken({
      appDb: appDb.db,
      nowIso: "2026-05-31T01:30:00.000Z",
      questionBankProvider,
      token,
    });

    expect(activeResponse.status).toBe("active");
    if (activeResponse.status !== "active") {
      throw new Error("Expected active response.");
    }
    expect(activeResponse.questions).toHaveLength(20);

    const answers = activeResponse.questions.map((question) => {
      const selectedAnswer = question.choices[0]?.label;
      if (selectedAnswer === undefined) {
        throw new Error(`Question ${question.index} has no answer choices.`);
      }
      return {
        questionIndex: question.index,
        selectedAnswer,
      };
    });

    const submittedResponse = await submitQuizByToken({
      appDb: appDb.db,
      questionBankProvider,
      request: { answers },
      submittedAt: "2026-05-31T01:35:00.000Z",
      token,
    });

    expect(submittedResponse.status).toBe("submitted");
    expect(submittedResponse.summary.totalQuestions).toBe(20);
    expect(submittedResponse.questions).toHaveLength(20);
    expect(submittedResponse.questions[0]).toHaveProperty("correctAnswer");
    expect(submittedResponse.questions[0]).toHaveProperty("explanation");
  });
});
