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

  it("fills missing reinforcement questions from other categories", async () => {
    const appDb = await createMigratedAppDbFixture({ seedUser: false });
    const primaryCandidates = Array.from({ length: 15 }, (_, index) =>
      makeCandidate(index + 1, "minor-a")
    );
    const fallbackCandidates = Array.from({ length: 10 }, (_, index) =>
      makeCandidate(index + 101, "other-a")
    );
    const allCandidates = [...primaryCandidates, ...fallbackCandidates];
    const provider: QuestionBankProvider = {
      findCandidates: async (filters) => {
        if (filters?.categories?.includes("minor-a") === true) {
          return primaryCandidates;
        }

        if (filters?.categories?.includes("minor-b") === true) {
          return [];
        }

        return allCandidates;
      },
      getDetailByUrl: async () => null,
      getDetailsByUrls: async () => [],
      listKeywords: async () => ({ categories: ["minor-a"], topics: ["topic-a"] }),
    };

    await createQuizSessionFromScopeMessage({
      appDb: appDb.db,
      matchedScope: {
        candidateMinorCategories: ["minor-a"],
        majorCategory: "major-a",
        matchedCategories: ["minor-a"],
        matchedTopics: [],
        method: "local_exact",
        minorCategory: "minor-a",
        scopeType: "minor_category",
        status: "matched",
        suggestions: [],
      },
      nowIso: "2026-05-31T00:00:00.000Z",
      questionBankProvider: provider,
      rawScopeInput: "minor-a",
      selectionSeedFactory: () => "provider-fallback-seed",
      sessionIdFactory: () => "session-provider-fallback",
      telegramUser: { id: 12345 },
      tokenFactory: () => "token-provider-fallback",
      topicsConfig: {
        aliases: {},
        category_tree: {
          "major-a": ["minor-a", "minor-b"],
        },
        high_weight_topics: ["major-a"],
      },
    });

    const rows = appDb.sqlite
      .prepare(
        "SELECT source_category, source_type FROM quiz_session_questions WHERE quiz_session_id = ? ORDER BY question_index"
      )
      .all("session-provider-fallback") as Array<{
      source_category: string;
      source_type: string;
    }>;

    expect(rows).toHaveLength(20);
    expect(rows.filter((row) => row.source_type === "requested")).toHaveLength(
      15
    );
    expect(
      rows
        .filter((row) => row.source_type === "reinforcement")
        .every((row) => row.source_category === "other-a")
    ).toBe(true);
  });
});
