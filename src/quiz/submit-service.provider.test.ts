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

import { validateSubmitQuizRequest } from "./submit-service";

function makeDetail(index: number): QuestionDetail {
  return {
    answer: "A",
    choices: [
      { label: "A", text: "Choice A" },
      { label: "B", text: "Choice B" },
    ],
    explanation: `Explanation ${index}`,
    fetchedAt: "2026-05-31T00:00:00.000Z",
    hasImages: false,
    images: [],
    questionText: `Question ${index}`,
    questionUrl: `https://example.test/provider-submit-q${index}.html`,
    sourceUrl: `https://example.test/source-submit-q${index}.html`,
  };
}

describe("validateSubmitQuizRequest provider integration", () => {
  afterEach(async () => {
    await cleanupIntegrationFixtures();
  });

  it("loads grading details through one provider batch call", async () => {
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
          return detail;
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
      id: "session-provider-submit",
      matchedScopeJson: { matchedTopics: ["topic-a"] },
      purgeAfterAt: "2026-07-07T01:00:00.000Z",
      questions: details.map((detail, index) => ({
        id: `session-provider-submit-question-${index + 1}`,
        questionIndex: index + 1,
        questionUrl: detail.questionUrl,
        selectionReason: null,
        sourceCategory: "category-a",
        sourceTopic: "topic-a",
        sourceType: "requested",
      })),
      rawScopeInput: "topic-a",
      selectionSummaryJson: { requestedScopeCount: 15 },
      token: "token-provider-submit",
      userId: "user-1",
    });

    const result = await validateSubmitQuizRequest({
      appDb: appDb.db,
      nowIso: "2026-05-31T01:30:00.000Z",
      questionBankProvider: provider,
      request: {
        answers: details.map((_, index) => ({
          questionIndex: index + 1,
          selectedAnswer: "A",
        })),
      },
      token: "token-provider-submit",
    });

    expect(getDetailsByUrls).toHaveBeenCalledTimes(1);
    expect(getDetailsByUrls).toHaveBeenCalledWith(
      details.map((detail) => detail.questionUrl),
      { includeAnswer: true, includeExplanation: true }
    );
    expect(result.answers).toHaveLength(20);
    expect(result.answers[0]).toEqual({
      correctAnswer: "A",
      questionIndex: 1,
      selectedAnswer: "A",
    });
  });
});
