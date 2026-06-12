/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { createQuizSession } from "@/db/app/repositories/quiz-sessions";
import type { QuestionBankProvider } from "@/db/question-bank/provider";
import type { QuestionDetail } from "@/db/question-bank/queries";
import {
  cleanupIntegrationFixtures,
  createMigratedAppDbFixture,
} from "@/test/integration-fixtures";

import { loadQuizByToken } from "./quiz-service";

function makeDetail(index: number): QuestionDetail {
  return {
    answer: "A",
    choices: [
      { label: "A", text: "Choice A" },
      { label: "B", text: "Choice B" },
    ],
    explanation: `Explanation ${index}`,
    fetchedAt: "2026-05-31T00:00:00.000Z",
    hasImages: index === 1,
    images: [],
    questionText: `Question ${index}`,
    questionUrl: `https://example.test/provider-q${index}.html`,
    sourceUrl: `https://example.test/source-q${index}.html`,
  };
}

describe("loadQuizByToken provider integration", () => {
  afterEach(async () => {
    await cleanupIntegrationFixtures();
  });

  it("loads active quiz details through one provider batch call without answer payload fields", async () => {
    const appDb = await createMigratedAppDbFixture();
    const details = Array.from({ length: 20 }, (_, index) =>
      makeDetail(index + 1)
    );
    const getDetailsByUrls = vi.fn<QuestionBankProvider["getDetailsByUrls"]>(
      async (urls) =>
        urls.map((url) => {
          const detail = details.find((item) => item.questionUrl === url);
          if (detail === undefined) {
            throw new Error(`Missing fixture detail for ${url}`);
          }
          return {
            ...detail,
            answer: null,
            explanation: null,
          };
        })
    );
    const provider: QuestionBankProvider = {
      findCandidates: async () => [],
      getDetailByUrl: async () => null,
      getDetailsByUrls,
      listKeywords: async () => ({ categories: [], topics: [] }),
    };

    await createQuizSession(appDb.db, {
      createdAt: "2026-05-31T01:00:00.000Z",
      expiresAt: "2026-06-07T01:00:00.000Z",
      id: "session-provider-load",
      matchedScopeJson: { matchedTopics: ["topic-a"] },
      purgeAfterAt: "2026-07-07T01:00:00.000Z",
      questions: details.map((detail, index) => ({
        id: `session-provider-question-${index + 1}`,
        questionIndex: index + 1,
        questionUrl: detail.questionUrl,
        selectionReason: null,
        sourceCategory: "category-a",
        sourceTopic: "topic-a",
        sourceType: "requested",
      })),
      rawScopeInput: "topic-a",
      selectionSummaryJson: { requestedScopeCount: 15 },
      token: "token-provider-load",
      userId: "user-1",
    });

    const response = await loadQuizByToken({
      appDb: appDb.db,
      nowIso: "2026-05-31T01:30:00.000Z",
      questionBankProvider: provider,
      token: "token-provider-load",
    });

    expect(getDetailsByUrls).toHaveBeenCalledTimes(1);
    expect(getDetailsByUrls).toHaveBeenCalledWith(
      details.map((detail) => detail.questionUrl),
      { includeAnswer: false, includeExplanation: false }
    );
    expect(response.status).toBe("active");
    if (response.status !== "active") {
      throw new Error("Expected active response.");
    }
    expect(response.questions[0]).toEqual({
      choices: [
        { label: "A", text: "Choice A" },
        { label: "B", text: "Choice B" },
      ],
      hasImages: true,
      index: 1,
      questionText: "Question 1",
      questionUrl: "https://example.test/provider-q1.html",
    });
    expect(response.questions[0]).not.toHaveProperty("correctAnswer");
    expect(response.questions[0]).not.toHaveProperty("explanation");
    expect(response.questions[0]).not.toHaveProperty("sourceUrl");
  });
});
