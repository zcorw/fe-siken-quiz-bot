/**
 * @vitest-environment node
 */
import type Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import {
  cleanupIntegrationFixtures,
  createMigratedAppDbFixture,
  createQuestionBankFixture,
} from "@/test/integration-fixtures";
import { createQuizSessionFromScopeMessage } from "./quiz-session-factory";

function insertQuestionBankQuestion(
  questionDb: Database.Database,
  {
    category,
    id,
  }: {
    category: string;
    id: number;
  }
): void {
  questionDb
    .prepare(
      `
        INSERT INTO questions (
          id,
          source_page_label,
          source_page_url,
          exam_part,
          question_no,
          topic,
          category,
          url,
          scraped_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      id,
      "令和6年春",
      "https://example.test/source.html",
      "科目A",
      `問${id}`,
      "DNS",
      category,
      `https://example.test/category-q${id}.html`,
      "2026-05-31T00:00:00.000Z"
    );
}

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

  it("does not use a matched major category as a question topic filter", async () => {
    const appDb = await createMigratedAppDbFixture({ seedUser: false });
    const questionDb = await createQuestionBankFixture({
      category: "無関係カテゴリ",
      topic: "ネットワーク",
    });

    const insertQuestion = questionDb.prepare(`
      INSERT INTO questions (
        id,
        source_page_label,
        source_page_url,
        exam_part,
        question_no,
        topic,
        category,
        url,
        scraped_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertDetail = questionDb.prepare(`
      INSERT INTO question_details (
        question_url,
        question_text,
        choices_json,
        answer,
        explanation,
        images_json,
        has_images,
        fetched_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let index = 21; index <= 40; index += 1) {
      const url = `https://example.test/network-category-q${index}.html`;
      insertQuestion.run(
        index,
        "令和6年春",
        "https://example.test/source.html",
        "科目A",
        `問${index}`,
        "DNS",
        "通信プロトコル",
        url,
        "2026-05-31T00:00:00.000Z"
      );
      insertDetail.run(
        url,
        `問題文 ${index}`,
        JSON.stringify({ ア: "選択肢A", イ: "選択肢B" }),
        "ア",
        `解説 ${index}`,
        "[]",
        0,
        "2026-05-31T00:00:00.000Z"
      );
    }

    await createQuizSessionFromScopeMessage({
      appDb: appDb.db,
      matchedScope: {
        candidateMinorCategories: ["通信プロトコル"],
        majorCategory: "ネットワーク",
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
      rawScopeInput: "ネットワーク",
      sessionIdFactory: () => "session-network-major",
      telegramUser: { id: 12345 },
      tokenFactory: () => "token-network-major",
      topicsConfig: {
        aliases: {},
        category_tree: {
          ネットワーク: ["通信プロトコル"],
        },
        high_weight_topics: ["ネットワーク"],
      },
    });

    const rows = appDb.sqlite
      .prepare(
        "SELECT source_category, source_topic FROM quiz_session_questions ORDER BY question_index"
      )
      .all() as Array<{ source_category: string; source_topic: string }>;

    expect(rows).toHaveLength(20);
    expect(rows.every((row) => row.source_category === "通信プロトコル")).toBe(
      true
    );
  });

  it("records the matched major category and expanded minor categories", async () => {
    const appDb = await createMigratedAppDbFixture({ seedUser: false });
    const questionDb = await createQuestionBankFixture({
      questionCount: 0,
    });
    const insertQuestion = questionDb.prepare(`
      INSERT INTO questions (
        id,
        source_page_label,
        source_page_url,
        exam_part,
        question_no,
        topic,
        category,
        url,
        scraped_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let index = 1; index <= 20; index += 1) {
      const category = index <= 10 ? "通信プロトコル" : "ネットワーク方式";
      insertQuestion.run(
        index,
        "令和6年春",
        "https://example.test/source.html",
        "科目A",
        `問${index}`,
        "DNS",
        category,
        `https://example.test/major-category-q${index}.html`,
        "2026-05-31T00:00:00.000Z"
      );
    }

    await createQuizSessionFromScopeMessage({
      appDb: appDb.db,
      matchedScope: {
        candidateMinorCategories: ["通信プロトコル", "ネットワーク方式"],
        majorCategory: "ネットワーク",
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
      rawScopeInput: "ネットワーク",
      sessionIdFactory: () => "session-major-summary",
      telegramUser: { id: 12345 },
      tokenFactory: () => "token-major-summary",
      topicsConfig: {
        aliases: {},
        category_tree: {
          ネットワーク: ["通信プロトコル", "ネットワーク方式"],
        },
        high_weight_topics: ["ネットワーク"],
      },
    });

    const questionRows = appDb.sqlite
      .prepare(
        "SELECT DISTINCT source_category FROM quiz_session_questions ORDER BY source_category"
      )
      .all() as Array<{ source_category: string }>;
    const sessionRow = appDb.sqlite
      .prepare(
        "SELECT selection_summary_json FROM quiz_sessions WHERE id = ?"
      )
      .get("session-major-summary") as {
      selection_summary_json: string;
    };

    expect(questionRows.map((row) => row.source_category)).toEqual([
      "ネットワーク方式",
      "通信プロトコル",
    ]);
    expect(JSON.parse(sessionRow.selection_summary_json)).toEqual(
      expect.objectContaining({
        requestedMajorCategory: "ネットワーク",
        requestedMinorCategories: ["通信プロトコル", "ネットワーク方式"],
      })
    );
  });

  it("uses only the matched minor category for requested questions when enough questions exist", async () => {
    const appDb = await createMigratedAppDbFixture({ seedUser: false });
    const questionDb = await createQuestionBankFixture({
      questionCount: 0,
    });

    for (let index = 1; index <= 20; index += 1) {
      insertQuestionBankQuestion(questionDb, {
        category: "通信プロトコル",
        id: index,
      });
      insertQuestionBankQuestion(questionDb, {
        category: "ネットワーク方式",
        id: index + 20,
      });
    }

    await createQuizSessionFromScopeMessage({
      appDb: appDb.db,
      matchedScope: {
        candidateMinorCategories: ["通信プロトコル"],
        majorCategory: "ネットワーク",
        matchedCategories: ["通信プロトコル"],
        matchedTopics: [],
        method: "local_exact",
        minorCategory: "通信プロトコル",
        scopeType: "minor_category",
        status: "matched",
        suggestions: [],
      },
      nowIso: "2026-05-31T00:00:00.000Z",
      questionDb,
      rawScopeInput: "通信プロトコル",
      sessionIdFactory: () => "session-minor-enough",
      telegramUser: { id: 12345 },
      tokenFactory: () => "token-minor-enough",
      topicsConfig: {
        aliases: {},
        category_tree: {
          ネットワーク: ["通信プロトコル", "ネットワーク方式"],
        },
        high_weight_topics: ["ネットワーク"],
      },
    });

    const requestedRows = appDb.sqlite
      .prepare(
        "SELECT source_category FROM quiz_session_questions WHERE source_type = 'requested' ORDER BY question_index"
      )
      .all() as Array<{ source_category: string }>;
    const sessionRow = appDb.sqlite
      .prepare(
        "SELECT selection_summary_json FROM quiz_sessions WHERE id = ?"
      )
      .get("session-minor-enough") as {
      selection_summary_json: string;
    };

    expect(requestedRows).toHaveLength(15);
    expect(
      requestedRows.every((row) => row.source_category === "通信プロトコル")
    ).toBe(true);
    expect(JSON.parse(sessionRow.selection_summary_json)).toEqual(
      expect.objectContaining({
        primaryMinorCategory: "通信プロトコル",
        siblingMinorCategoriesUsed: [],
      })
    );
  });

  it("fills requested questions from sibling categories when the matched minor category is short", async () => {
    const appDb = await createMigratedAppDbFixture({ seedUser: false });
    const questionDb = await createQuestionBankFixture({
      questionCount: 0,
    });

    for (let index = 1; index <= 10; index += 1) {
      insertQuestionBankQuestion(questionDb, {
        category: "通信プロトコル",
        id: index,
      });
    }

    for (let index = 11; index <= 20; index += 1) {
      insertQuestionBankQuestion(questionDb, {
        category: "ネットワーク方式",
        id: index,
      });
    }

    await createQuizSessionFromScopeMessage({
      appDb: appDb.db,
      matchedScope: {
        candidateMinorCategories: ["通信プロトコル"],
        majorCategory: "ネットワーク",
        matchedCategories: ["通信プロトコル"],
        matchedTopics: [],
        method: "local_exact",
        minorCategory: "通信プロトコル",
        scopeType: "minor_category",
        status: "matched",
        suggestions: [],
      },
      nowIso: "2026-05-31T00:00:00.000Z",
      questionDb,
      rawScopeInput: "通信プロトコル",
      sessionIdFactory: () => "session-minor-short",
      telegramUser: { id: 12345 },
      tokenFactory: () => "token-minor-short",
      topicsConfig: {
        aliases: {},
        category_tree: {
          ネットワーク: ["通信プロトコル", "ネットワーク方式"],
        },
        high_weight_topics: ["ネットワーク"],
      },
    });

    const requestedRows = appDb.sqlite
      .prepare(
        "SELECT source_category FROM quiz_session_questions WHERE source_type = 'requested' ORDER BY question_index"
      )
      .all() as Array<{ source_category: string }>;
    const sessionRow = appDb.sqlite
      .prepare(
        "SELECT selection_summary_json FROM quiz_sessions WHERE id = ?"
      )
      .get("session-minor-short") as {
      selection_summary_json: string;
    };

    const requestedCategoryCounts = new Map<string, number>();
    for (const row of requestedRows) {
      requestedCategoryCounts.set(
        row.source_category,
        (requestedCategoryCounts.get(row.source_category) ?? 0) + 1
      );
    }

    expect(requestedRows).toHaveLength(15);
    expect([...requestedCategoryCounts.values()].sort((left, right) => left - right)).toEqual([
      5,
      10,
    ]);
    expect(JSON.parse(sessionRow.selection_summary_json)).toEqual(
      expect.objectContaining({
        primaryMinorCategory: "通信プロトコル",
        siblingMinorCategoriesUsed: ["ネットワーク方式"],
      })
    );
  });

  it("selects different requested questions and display order for different seeds", async () => {
    const appDb = await createMigratedAppDbFixture({ seedUser: false });
    const questionDb = await createQuestionBankFixture({
      questionCount: 0,
    });

    for (let index = 1; index <= 30; index += 1) {
      insertQuestionBankQuestion(questionDb, {
        category: "minor-a",
        id: index,
      });
    }

    for (const [sessionId, token, seed] of [
      ["session-seed-a", "token-seed-a", "seed-a"],
      ["session-seed-b", "token-seed-b", "seed-b"],
    ] as const) {
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
        questionDb,
        rawScopeInput: "major-a",
        selectionSeedFactory: () => seed,
        sessionIdFactory: () => sessionId,
        telegramUser: { id: 12345 },
        tokenFactory: () => token,
        topicsConfig: {
          aliases: {},
          category_tree: {
            "major-a": ["minor-a"],
          },
          high_weight_topics: ["major-a"],
        },
      });
    }

    const firstRows = appDb.sqlite
      .prepare(
        "SELECT question_url FROM quiz_session_questions WHERE quiz_session_id = ? ORDER BY question_index"
      )
      .all("session-seed-a") as Array<{ question_url: string }>;
    const secondRows = appDb.sqlite
      .prepare(
        "SELECT question_url FROM quiz_session_questions WHERE quiz_session_id = ? ORDER BY question_index"
      )
      .all("session-seed-b") as Array<{ question_url: string }>;

    expect(firstRows).toHaveLength(20);
    expect(secondRows).toHaveLength(20);
    expect(secondRows.map((row) => row.question_url)).not.toEqual(
      firstRows.map((row) => row.question_url)
    );
  });

  it("prioritizes historical wrong questions over unseen requested candidates", async () => {
    const appDb = await createMigratedAppDbFixture({ seedUser: false });
    const questionDb = await createQuestionBankFixture({
      questionCount: 0,
    });

    await appDb.sqlite
      .prepare(
        `
          INSERT INTO users (
            id,
            telegram_user_id,
            telegram_username,
            telegram_first_name,
            telegram_last_name,
            created_at,
            last_seen_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        "user-with-stats",
        "98765",
        null,
        null,
        null,
        "2026-05-30T00:00:00.000Z",
        "2026-05-30T00:00:00.000Z"
      );

    for (let index = 1; index <= 30; index += 1) {
      insertQuestionBankQuestion(questionDb, {
        category: "minor-a",
        id: index,
      });
    }

    appDb.sqlite
      .prepare(
        `
          INSERT INTO user_question_stats (
            user_id,
            question_url,
            attempt_count,
            correct_count,
            incorrect_count,
            last_answered_at,
            last_is_correct,
            active_wrong,
            consecutive_correct_after_wrong
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        "user-with-stats",
        "https://example.test/category-q30.html",
        3,
        1,
        2,
        "2026-05-30T01:00:00.000Z",
        0,
        1,
        0
      );

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
      questionDb,
      rawScopeInput: "major-a",
      selectionSeedFactory: () => "seed-a",
      sessionIdFactory: () => "session-wrong-priority",
      telegramUser: { id: 98765 },
      tokenFactory: () => "token-wrong-priority",
      topicsConfig: {
        aliases: {},
        category_tree: {
          "major-a": ["minor-a"],
        },
        high_weight_topics: ["major-a"],
      },
    });

    const selectedUrls = appDb.sqlite
      .prepare(
        "SELECT question_url FROM quiz_session_questions WHERE quiz_session_id = ?"
      )
      .all("session-wrong-priority") as Array<{ question_url: string }>;

    expect(selectedUrls.map((row) => row.question_url)).toContain(
      "https://example.test/category-q30.html"
    );
  });
});
