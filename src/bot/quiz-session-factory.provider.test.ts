/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it } from "vitest";

import type { QuestionBankProvider } from "@/db/question-bank/provider";
import type { QuestionCandidateRow } from "@/db/question-bank/queries";
import {
  cleanupIntegrationFixtures,
  createMigratedAppDbFixture,
} from "@/test/integration-fixtures";

import { createQuizSessionFromScopeMessage } from "./quiz-session-factory";

function makeCandidate(index: number, category = "minor-a"): QuestionCandidateRow {
  return {
    category,
    examPart: "科目A",
    id: index,
    questionNo: `q${index}`,
    scrapedAt: "2026-05-31T00:00:00.000Z",
    sourcePageLabel: "fixture",
    sourcePageUrl: "https://example.test/source.html",
    topic: "topic-a",
    url: `https://example.test/provider-q${index}.html`,
  };
}

describe("createQuizSessionFromScopeMessage provider integration", () => {
  afterEach(async () => {
    await cleanupIntegrationFixtures();
  });

  it("creates a quiz session from provider candidates without a question SQLite handle", async () => {
    const appDb = await createMigratedAppDbFixture({ seedUser: false });
    const candidates = Array.from({ length: 20 }, (_, index) =>
      makeCandidate(index + 1)
    );
    const provider: QuestionBankProvider = {
      findCandidates: async (filters) =>
        filters?.categories?.includes("minor-a") === true ? candidates : [],
      getDetailByUrl: async () => null,
      getDetailsByUrls: async () => [],
      listKeywords: async () => ({ categories: ["minor-a"], topics: ["topic-a"] }),
    };

    await createQuizSessionFromScopeMessage({
      appDb: appDb.db,
      matchedScope: {
        candidateMinorCategories: ["minor-a"],
        majorCategory: "major-a",
        matchedCategories: [],
        matchedTopics: [],
        method: "local_exact",
        minorCategory: undefined,
        scopeType: "major_category",
        status: "matched",
        suggestions: [],
      },
      nowIso: "2026-05-31T00:00:00.000Z",
      questionBankProvider: provider,
      rawScopeInput: "major-a",
      selectionSeedFactory: () => "provider-seed",
      sessionIdFactory: () => "session-provider",
      telegramUser: { id: 12345 },
      tokenFactory: () => "token-provider",
      topicsConfig: {
        aliases: {},
        category_tree: {
          "major-a": ["minor-a"],
        },
        high_weight_topics: ["major-a"],
      },
    });

    const rows = appDb.sqlite
      .prepare(
        "SELECT question_url FROM quiz_session_questions WHERE quiz_session_id = ? ORDER BY question_index"
      )
      .all("session-provider") as Array<{ question_url: string }>;

    expect(rows).toHaveLength(20);
    expect(rows.map((row) => row.question_url).sort()).toEqual(
      candidates.map((candidate) => candidate.url).sort()
    );
  });
});
