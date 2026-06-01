/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it } from "vitest";

import {
  cleanupIntegrationFixtures,
  createMigratedAppDbFixture,
  createQuestionBankFixture,
} from "@/test/integration-fixtures";
import { createQuizSessionFromScopeMessage } from "./quiz-session-factory";

describe("createQuizSessionFromScopeMessage", () => {
  afterEach(async () => {
    await cleanupIntegrationFixtures();
  });

  it("selects questions through category tree minors when the bank uses finer categories", async () => {
    const appDb = await createMigratedAppDbFixture({ seedUser: false });
    const questionDb = await createQuestionBankFixture({
      category: "データ操作",
      topic: "SQL文",
    });

    await createQuizSessionFromScopeMessage({
      appDb: appDb.db,
      matchedScope: {
        candidateMinorCategories: ["データ操作"],
        majorCategory: "データベース",
        matchedCategories: [],
        matchedTopics: [],
        method: "local_exact",
        minorCategory: undefined,
        scopeType: "major_category",
        status: "matched",
        suggestions: [],
      },
      nowIso: "2026-05-31T00:00:00.000Z",
      questionDb,
      rawScopeInput: "データベース",
      sessionIdFactory: () => "session-mapped-topic",
      telegramUser: { id: 12345 },
      tokenFactory: () => "token-mapped-topic",
      topicsConfig: {
        aliases: {},
        category_tree: {
          データベース: ["データ操作"],
        },
        high_weight_topics: ["データベース"],
      },
    });

    const rows = appDb.sqlite
      .prepare(
        "SELECT source_category, source_topic FROM quiz_session_questions ORDER BY question_index"
      )
      .all() as Array<{ source_category: string; source_topic: string }>;

    expect(rows).toHaveLength(20);
    expect(rows[0]).toEqual({
      source_category: "データ操作",
      source_topic: "SQL文",
    });
  });
});
