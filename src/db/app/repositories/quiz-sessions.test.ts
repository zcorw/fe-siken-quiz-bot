/**
 * @vitest-environment node
 */
import { count, eq } from "drizzle-orm";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { openAppDb, type AppDbClient } from "../client";
import { quizSessionQuestions, quizSessions, users } from "../schema";
import {
  createQuizSession,
  type CreateQuizSessionInput,
} from "./quiz-sessions";

const migrationsDir = path.join(process.cwd(), "drizzle");
const tempDirs: string[] = [];

async function loadMigrationSql(): Promise<string> {
  expect(
    existsSync(migrationsDir),
    "Expected Drizzle migration output in drizzle/"
  ).toBe(true);

  const migrationFiles = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  expect(
    migrationFiles.length,
    "Expected at least one SQL migration"
  ).toBeGreaterThan(0);

  return migrationFiles
    .map((file) => readFileSync(path.join(migrationsDir, file), "utf8"))
    .join("\n");
}

async function createMigratedAppDb(): Promise<AppDbClient> {
  const tempDir = await mkdtemp(path.join(tmpdir(), "fe-quiz-session-repo-"));
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

function makeQuestions(
  overrides: Partial<CreateQuizSessionInput["questions"][number]> = {}
): CreateQuizSessionInput["questions"] {
  return Array.from({ length: 20 }, (_, index) => ({
    id: `session-question-${index + 1}`,
    questionUrl: `https://example.test/questions/${index + 1}`,
    questionIndex: index + 1,
    sourceType: "topic",
    sourceTopic: index % 2 === 0 ? "network" : null,
    sourceCategory: "technology",
    selectionReason: `fixture-${index + 1}`,
    ...overrides,
  }));
}

function makeSessionInput(
  overrides: Partial<CreateQuizSessionInput> = {}
): CreateQuizSessionInput {
  return {
    id: "session-1",
    token: "token-1",
    userId: "user-1",
    rawScopeInput: "network questions",
    matchedScopeJson: { type: "topic", value: "network" },
    selectionSummaryJson: { totalCandidates: 42, selected: 20 },
    createdAt: "2026-05-31T01:00:00.000Z",
    expiresAt: "2026-05-31T02:00:00.000Z",
    purgeAfterAt: "2026-06-30T01:00:00.000Z",
    questions: makeQuestions(),
    ...overrides,
  };
}

async function countSessions(appDb: AppDbClient, id = "session-1") {
  const [row] = await appDb.db
    .select({ value: count() })
    .from(quizSessions)
    .where(eq(quizSessions.id, id));

  return row.value;
}

describe("createQuizSession", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs
        .splice(0)
        .map((tempDir) => rm(tempDir, { recursive: true, force: true }))
    );
  });

  it("creates a session and 20 session questions with expected fields", async () => {
    const appDb = await createMigratedAppDb();

    try {
      await createQuizSession(appDb.db, makeSessionInput());

      const [session] = await appDb.db
        .select()
        .from(quizSessions)
        .where(eq(quizSessions.id, "session-1"));
      expect(session).toMatchObject({
        id: "session-1",
        token: "token-1",
        userId: "user-1",
        rawScopeInput: "network questions",
        matchedScopeJson: JSON.stringify({ type: "topic", value: "network" }),
        selectionSummaryJson: JSON.stringify({
          totalCandidates: 42,
          selected: 20,
        }),
        status: "created",
        totalQuestions: 20,
        correctCount: null,
        incorrectCount: null,
        submittedAt: null,
        createdAt: "2026-05-31T01:00:00.000Z",
        expiresAt: "2026-05-31T02:00:00.000Z",
        purgeAfterAt: "2026-06-30T01:00:00.000Z",
      });

      const questions = await appDb.db
        .select()
        .from(quizSessionQuestions)
        .where(eq(quizSessionQuestions.quizSessionId, "session-1"))
        .orderBy(quizSessionQuestions.questionIndex);
      expect(questions).toHaveLength(20);
      expect(questions[0]).toMatchObject({
        id: "session-question-1",
        quizSessionId: "session-1",
        questionUrl: "https://example.test/questions/1",
        questionIndex: 1,
        sourceType: "topic",
        sourceTopic: "network",
        sourceCategory: "technology",
        selectionReason: "fixture-1",
      });
    } finally {
      appDb.close();
    }
  });

  it("rejects non-20 question counts before writing", async () => {
    const appDb = await createMigratedAppDb();

    try {
      await expect(
        createQuizSession(
          appDb.db,
          makeSessionInput({ questions: makeQuestions().slice(0, 19) })
        )
      ).rejects.toThrow("createQuizSession requires exactly 20 questions");

      expect(await countSessions(appDb)).toBe(0);
    } finally {
      appDb.close();
    }
  });

  it("rejects question indexes outside the required 1-20 sequence before writing", async () => {
    const appDb = await createMigratedAppDb();
    const questions = makeQuestions();
    questions[0] = { ...questions[0], questionIndex: 0 };

    try {
      await expect(
        createQuizSession(appDb.db, makeSessionInput({ questions }))
      ).rejects.toThrow(
        "createQuizSession question indexes must be exactly 1 through 20."
      );

      expect(await countSessions(appDb)).toBe(0);
    } finally {
      appDb.close();
    }
  });

  it("serializes string JSON values as JSON strings", async () => {
    const appDb = await createMigratedAppDb();

    try {
      await createQuizSession(
        appDb.db,
        makeSessionInput({
          matchedScopeJson: "network",
          selectionSummaryJson: "summary",
        })
      );

      const [session] = await appDb.db
        .select()
        .from(quizSessions)
        .where(eq(quizSessions.id, "session-1"));

      expect(session.matchedScopeJson).toBe(JSON.stringify("network"));
      expect(session.selectionSummaryJson).toBe(JSON.stringify("summary"));
    } finally {
      appDb.close();
    }
  });

  it.each([
    [
      "question index",
      (questions: CreateQuizSessionInput["questions"]) => {
        questions[1] = {
          ...questions[1],
          questionIndex: questions[0].questionIndex,
        };
      },
    ],
    [
      "question URL",
      (questions: CreateQuizSessionInput["questions"]) => {
        questions[1] = {
          ...questions[1],
          questionUrl: questions[0].questionUrl,
        };
      },
    ],
  ])("rolls back the session when duplicate %s fails", async (_, mutate) => {
    const appDb = await createMigratedAppDb();
    const questions = makeQuestions();
    mutate(questions);

    try {
      await expect(
        createQuizSession(appDb.db, makeSessionInput({ questions }))
      ).rejects.toThrow();

      expect(await countSessions(appDb)).toBe(0);
    } finally {
      appDb.close();
    }
  });
});
