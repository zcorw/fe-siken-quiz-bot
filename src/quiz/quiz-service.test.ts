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
import {
  createQuizSession,
  submitQuizSession,
} from "@/db/app/repositories/quiz-sessions";
import { users } from "@/db/app/schema";
import { loadQuizByToken } from "./quiz-service";
import { ApiError } from "@/lib/api-response";

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
      if (response.status !== "active") {
        throw new Error("Expected active response.");
      }
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

  it("loads submitted quiz data with summary, answers, explanations, and source URLs", async () => {
    const appDb = await createMigratedAppDb();
    const questionDb = await createQuestionBankFixture();

    try {
      await createQuizSession(appDb.db, {
        id: "session-1",
        token: "token-1",
        userId: "user-1",
        rawScopeInput: "database",
        matchedScopeJson: { matchedTopics: ["データベース"] },
        selectionSummaryJson: {
          requestedScopeCount: 15,
          reinforcementCount: 5,
          wrongQuestionCount: 1,
          weakTopicCount: 2,
          highWeightTopicCount: 2,
          selectionSeed: "internal-seed",
          randomizationVersion: 1,
          randomizedRequestedScope: true,
          randomizedReinforcement: true,
        },
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
      await submitQuizSession(appDb.db, {
        quizSessionId: "session-1",
        submittedAt: "2026-05-31T01:30:00.000Z",
        answers: Array.from({ length: 20 }, (_, index) => ({
          questionIndex: index + 1,
          selectedAnswer: index === 0 ? "イ" : "ア",
          correctAnswer: "ア",
        })),
      });

      const response = await loadQuizByToken({
        appDb: appDb.db,
        questionDb,
        token: "token-1",
        nowIso: "2026-05-31T01:31:00.000Z",
      });

      expect(response.status).toBe("submitted");
      if (response.status !== "submitted") {
        throw new Error("Expected submitted response.");
      }
      expect(response.summary).toEqual({
        totalQuestions: 20,
        correctCount: 19,
        incorrectCount: 1,
        accuracy: 0.95,
      });
      expect(response.selectionSummary).toEqual({
        requestedScopeCount: 15,
        reinforcementCount: 5,
        wrongQuestionCount: 1,
        weakTopicCount: 2,
        highWeightTopicCount: 2,
      });
      expect(response.selectionSummary).not.toHaveProperty("selectionSeed");
      expect(response.selectionSummary).not.toHaveProperty(
        "randomizationVersion"
      );
      expect(response.selectionSummary).not.toHaveProperty(
        "randomizedRequestedScope"
      );
      expect(response.selectionSummary).not.toHaveProperty(
        "randomizedReinforcement"
      );
      expect(response.questions[0]).toMatchObject({
        index: 1,
        questionUrl: "https://example.test/q1.html",
        selectedAnswer: "イ",
        correctAnswer: "ア",
        isCorrect: false,
        explanation: "解説 1",
        sourceUrl: "https://example.test/q1.html",
      });
      expect(response.questions[0].choices).toEqual([
        { label: "ア", text: "選択肢ア" },
        { label: "イ", text: "選択肢イ" },
      ]);
    } finally {
      appDb.close();
      questionDb.close();
    }
  });

  it("maps missing tokens to INVALID_TOKEN", async () => {
    const appDb = await createMigratedAppDb();
    const questionDb = await createQuestionBankFixture();

    try {
      await expect(
        loadQuizByToken({
          appDb: appDb.db,
          questionDb,
          token: "missing",
          nowIso: "2026-05-31T01:30:00.000Z",
        })
      ).rejects.toMatchObject({
        code: "INVALID_TOKEN",
        status: 404,
      } satisfies Partial<ApiError>);
    } finally {
      appDb.close();
      questionDb.close();
    }
  });

  it("maps expired unsubmitted tokens to TOKEN_EXPIRED", async () => {
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
        expiresAt: "2026-05-31T01:10:00.000Z",
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

      await expect(
        loadQuizByToken({
          appDb: appDb.db,
          questionDb,
          token: "token-1",
          nowIso: "2026-05-31T01:30:00.000Z",
        })
      ).rejects.toMatchObject({
        code: "TOKEN_EXPIRED",
        status: 410,
      } satisfies Partial<ApiError>);
    } finally {
      appDb.close();
      questionDb.close();
    }
  });

  it("maps missing question details to QUIZ_LOAD_FAILED", async () => {
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
          questionUrl:
            index === 0
              ? "https://example.test/missing.html"
              : `https://example.test/q${index + 1}.html`,
          questionIndex: index + 1,
          sourceType: "requested",
          sourceTopic: "データベース",
          sourceCategory: "テクノロジ系",
          selectionReason: null,
        })),
      });

      await expect(
        loadQuizByToken({
          appDb: appDb.db,
          questionDb,
          token: "token-1",
          nowIso: "2026-05-31T01:30:00.000Z",
        })
      ).rejects.toMatchObject({
        code: "QUIZ_LOAD_FAILED",
        status: 500,
      } satisfies Partial<ApiError>);
    } finally {
      appDb.close();
      questionDb.close();
    }
  });
});
