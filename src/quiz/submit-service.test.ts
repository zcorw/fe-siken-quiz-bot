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
import { answerRecords, users } from "@/db/app/schema";
import { validateSubmitQuizRequest } from "./submit-service";
import { submitQuizByToken } from "./submit-service";

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
  const tempDir = await mkdtemp(path.join(tmpdir(), "fe-submit-service-"));
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

  return appDb;
}

async function createQuestionBankFixture(): Promise<Database.Database> {
  const tempDir = await mkdtemp(
    path.join(tmpdir(), "fe-submit-question-bank-")
  );
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
      0,
      "2026-05-31T00:00:00.000Z"
    );
  }

  return db;
}

function makeAnswers() {
  return Array.from({ length: 20 }, (_, index) => ({
    questionIndex: index + 1,
    selectedAnswer: "ア",
  }));
}

describe("validateSubmitQuizRequest", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs
        .splice(0)
        .map((tempDir) => rm(tempDir, { recursive: true, force: true }))
    );
  });

  it("returns normalized answers with correct answers when the request is valid", async () => {
    const appDb = await createMigratedAppDb();
    const questionDb = await createQuestionBankFixture();

    try {
      await expect(
        validateSubmitQuizRequest({
          appDb: appDb.db,
          questionDb,
          token: "token-1",
          request: { answers: makeAnswers() },
          nowIso: "2026-05-31T01:30:00.000Z",
        })
      ).resolves.toMatchObject({
        quizSessionId: "session-1",
        answers: expect.arrayContaining([
          { questionIndex: 1, selectedAnswer: "ア", correctAnswer: "ア" },
        ]),
      });
    } finally {
      appDb.close();
      questionDb.close();
    }
  });

  it("rejects incomplete answer requests", async () => {
    const appDb = await createMigratedAppDb();
    const questionDb = await createQuestionBankFixture();

    try {
      await expect(
        validateSubmitQuizRequest({
          appDb: appDb.db,
          questionDb,
          token: "token-1",
          request: { answers: makeAnswers().slice(0, 19) },
          nowIso: "2026-05-31T01:30:00.000Z",
        })
      ).rejects.toMatchObject({ code: "INCOMPLETE_ANSWERS", status: 422 });
    } finally {
      appDb.close();
      questionDb.close();
    }
  });

  it("rejects answers for questions outside the session", async () => {
    const appDb = await createMigratedAppDb();
    const questionDb = await createQuestionBankFixture();
    const answers = makeAnswers();
    answers[19] = { questionIndex: 21, selectedAnswer: "ア" };

    try {
      await expect(
        validateSubmitQuizRequest({
          appDb: appDb.db,
          questionDb,
          token: "token-1",
          request: { answers },
          nowIso: "2026-05-31T01:30:00.000Z",
        })
      ).rejects.toMatchObject({
        code: "QUESTION_NOT_IN_SESSION",
        status: 422,
      });
    } finally {
      appDb.close();
      questionDb.close();
    }
  });

  it("rejects selected answers that are not valid choices", async () => {
    const appDb = await createMigratedAppDb();
    const questionDb = await createQuestionBankFixture();
    const answers = makeAnswers();
    answers[0] = { questionIndex: 1, selectedAnswer: "ウ" };

    try {
      await expect(
        validateSubmitQuizRequest({
          appDb: appDb.db,
          questionDb,
          token: "token-1",
          request: { answers },
          nowIso: "2026-05-31T01:30:00.000Z",
        })
      ).rejects.toMatchObject({ code: "INVALID_ANSWER", status: 422 });
    } finally {
      appDb.close();
      questionDb.close();
    }
  });
});

describe("submitQuizByToken", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs
        .splice(0)
        .map((tempDir) => rm(tempDir, { recursive: true, force: true }))
    );
  });

  it("submits answers through the transaction and returns submitted quiz data", async () => {
    const appDb = await createMigratedAppDb();
    const questionDb = await createQuestionBankFixture();

    try {
      const response = await submitQuizByToken({
        appDb: appDb.db,
        questionDb,
        token: "token-1",
        request: {
          answers: makeAnswers().map((answer, index) =>
            index === 0 ? { ...answer, selectedAnswer: "イ" } : answer
          ),
        },
        submittedAt: "2026-05-31T01:30:00.000Z",
      });

      expect(response.status).toBe("submitted");
      expect(response.summary).toEqual({
        totalQuestions: 20,
        correctCount: 19,
        incorrectCount: 1,
        accuracy: 0.95,
      });
      expect(response.questions[0]).toMatchObject({
        selectedAnswer: "イ",
        correctAnswer: "ア",
        isCorrect: false,
      });
    } finally {
      appDb.close();
      questionDb.close();
    }
  });

  it("returns the first submitted result without writing history again", async () => {
    const appDb = await createMigratedAppDb();
    const questionDb = await createQuestionBankFixture();

    try {
      const firstResponse = await submitQuizByToken({
        appDb: appDb.db,
        questionDb,
        token: "token-1",
        request: { answers: makeAnswers() },
        submittedAt: "2026-05-31T01:30:00.000Z",
      });
      const answerCountAfterFirst = await appDb.db.select().from(answerRecords);

      const repeatedResponse = await submitQuizByToken({
        appDb: appDb.db,
        questionDb,
        token: "token-1",
        request: { answers: [] },
        submittedAt: "2026-05-31T01:31:00.000Z",
      });
      const answerCountAfterRepeat = await appDb.db
        .select()
        .from(answerRecords);

      expect(repeatedResponse).toEqual(firstResponse);
      expect(answerCountAfterFirst).toHaveLength(20);
      expect(answerCountAfterRepeat).toHaveLength(20);
    } finally {
      appDb.close();
      questionDb.close();
    }
  });
});
