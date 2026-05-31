/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it } from "vitest";

import { users } from "@/db/app/schema";
import {
  cleanupIntegrationFixtures,
  createMigratedAppDbFixture,
  createQuestionBankFixture,
} from "./integration-fixtures";

type QuestionDetailRow = {
  question_url: string;
  choices_json: string;
  answer: string;
  explanation: string;
};

describe("integration fixtures", () => {
  afterEach(async () => {
    await cleanupIntegrationFixtures();
  });

  it("creates a migrated app database with a fixture Telegram user", async () => {
    const appDb = await createMigratedAppDbFixture();

    const rows = await appDb.db.select().from(users);

    expect(rows).toMatchObject([
      {
        id: "user-1",
        telegramUserId: "telegram-1",
        telegramUsername: "fixture_user",
      },
    ]);
  });

  it("creates a question bank fixture with 20 answerable questions", async () => {
    const questionDb = await createQuestionBankFixture();

    const rows = questionDb
      .prepare(
        "select question_url, choices_json, answer, explanation from question_details order by question_url"
      )
      .all() as QuestionDetailRow[];

    expect(rows).toHaveLength(20);
    expect(rows[0]).toMatchObject({
      question_url: "https://example.test/q1.html",
      answer: "\u30a2",
      explanation: "\u89e3\u8aac 1",
    });
    expect(JSON.parse(String(rows[0]?.choices_json))).toEqual({
      "\u30a2": "\u9078\u629e\u80a2A",
      "\u30a4": "\u9078\u629e\u80a2B",
    });
  });
});
