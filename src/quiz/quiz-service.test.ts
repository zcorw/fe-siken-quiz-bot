/**
 * @vitest-environment node
 */
import Database from "better-sqlite3";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { openAppDb, type AppDbClient } from "@/db/app/client";
import { createQuizSession } from "@/db/app/repositories/quiz-sessions";
import { users } from "@/db/app/schema";
import { loadQuizByToken } from "./quiz-service";

const migrationsDir = path.join(process.cwd(), "drizzle");
const tempDirs: string[] = [];

async function loadMigrationSql(): Promise<string> {
  expect(existsSync(migrationsDir)).toBe(true);
  const migrationFiles = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  return migrationFiles
    .map((file) => readFileSync(path.join(migrationsDir, file), "utf8"))
    .join("\n");
}

async function createMigratedAppDb(): Promise<AppDbClient> {
  const tempDir = await mkdtemp(path.join(tmpdir(), "fe-quiz-service-"));
  tempDirs.push(tempDir);

  const appDb = openAppDb({ path: path.join(tempDir, "app.sqlite") });
  appDb.sqlite.exec(await loadMigrationSql());
  appDb.sqlite.pragma("foreign_keys = ON");

  await appDb.db.insert(users).values({
    id: "user-1",
    telegramUserId: "telegram-1",
    telegramUsername: "fixture_user",
    createdAt: "2026-05-31T00:00:00.000Z",
    lastSeenAt: "2026-05-31T00:00:00.000Z",
  });

  return appDb;
}

async function createQuestionBankFixture(): Promise<Database.Database> {
  const tempDir = await mkdtemp(path.join(tmpdir(), "fe-question-bank-"));
  tempDirs.push(tempDir);
  const db = new Database(path.join(tempDir, "questions.sqlite"));

  db.exec(`
    CREATE TABLE question_details (
      question_url TEXT PRIMARY KEY,
      question_text TEXT,
      choices_json TEXT,
      answer TEXT,
      explanation TEXT,
      images_json TEXT,
      has_images INTEGER,
      fetched_at TEXT
    );
  `);

  const insert = db.prepare(`
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

  for (let index = 1; index <= 20; index += 1) {
    insert.run(
      `https://example.test/q${index}.html`,
      `問題文 ${index}`,
      JSON.stringify({ ア: "選択肢ア", イ: "選択肢イ" }),
      "ア",
      `解説 ${index}`,
      "[]",
      index === 1 ? 1 : 0,
      "2026-05-31T00:00:00.000Z"
    );
  }

  return db;
}

describe("loadQuizByToken", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs
        .splice(0)
        .map((tempDir) => rm(tempDir, { recursive: true, force: true }))
    );
  });

  it("loads active quiz data without correct answers, explanations, or source URLs", async () => {
    const appDb = await createMigratedAppDb();
    const questionDb = await createQuestionBankFixture();

    try {
      await createQuizSession(appDb.db, {
        id: "session-1",
        token: "token-1",
        userId: "user-1",
        rawScopeInput: "database",
        matchedScopeJson: { matchedTopics: ["データベース"] },
        selectionSummaryJson: { requestedScopeCount: 15 },
        createdAt: "2026-05-31T01:00:00.000Z",
        expiresAt: "2026-06-07T01:00:00.000Z",
        purgeAfterAt: "2026-07-07T01:00:00.000Z",
        questions: Array.from({ length: 20 }, (_, index) => ({
          id: `session-question-${index + 1}`,
          questionUrl: `https://example.test/q${index + 1}.html`,
          questionIndex: index + 1,
          sourceType: "requested",
          sourceTopic: "データベース",
          sourceCategory: "テクノロジ系",
          selectionReason: null,
        })),
      });

      const response = await loadQuizByToken({
        appDb: appDb.db,
        questionDb,
        token: "token-1",
        nowIso: "2026-05-31T01:30:00.000Z",
      });

      expect(response.status).toBe("active");
      expect(response.totalQuestions).toBe(20);
      expect(response.questions).toHaveLength(20);
      expect(response.questions[0]).toEqual({
        index: 1,
        questionUrl: "https://example.test/q1.html",
        questionText: "問題文 1",
        choices: [
          { label: "ア", text: "選択肢ア" },
          { label: "イ", text: "選択肢イ" },
        ],
        hasImages: true,
      });
      expect(response.questions[0]).not.toHaveProperty("correctAnswer");
      expect(response.questions[0]).not.toHaveProperty("explanation");
      expect(response.questions[0]).not.toHaveProperty("sourceUrl");
    } finally {
      appDb.close();
      questionDb.close();
    }
  });
});
