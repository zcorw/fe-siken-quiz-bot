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
import {
  answerRecords,
  quizSessionQuestions,
  quizSessions,
  userQuestionStats,
  userTopicStats,
  users,
} from "../schema";
import {
  createQuizSession,
  deletePurgeableUnsubmittedSessions,
  findExpiredUnsubmittedSessions,
  findWeakTopicStats,
  submitQuizSession,
  type CreateQuizSessionInput,
  type SubmitQuizSessionInput,
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

function makeAnswers(
  overrides: Partial<SubmitQuizSessionInput["answers"][number]> = {}
): SubmitQuizSessionInput["answers"] {
  return Array.from({ length: 20 }, (_, index) => {
    const questionIndex = index + 1;
    const correctAnswer = "A";

    return {
      questionIndex,
      selectedAnswer: questionIndex % 3 === 0 ? "B" : correctAnswer,
      correctAnswer,
      ...overrides,
    };
  });
}

async function countSessions(appDb: AppDbClient, id = "session-1") {
  const [row] = await appDb.db
    .select({ value: count() })
    .from(quizSessions)
    .where(eq(quizSessions.id, id));

  return row.value;
}

async function countAnswerRecords(appDb: AppDbClient) {
  const [row] = await appDb.db.select({ value: count() }).from(answerRecords);

  return row.value;
}

async function countSessionQuestions(appDb: AppDbClient) {
  const [row] = await appDb.db
    .select({ value: count() })
    .from(quizSessionQuestions);

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

describe("submitQuizSession", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs
        .splice(0)
        .map((tempDir) => rm(tempDir, { recursive: true, force: true }))
    );
  });

  it("submits first answers and updates session, answer, question, and topic stats", async () => {
    const appDb = await createMigratedAppDb();

    try {
      await createQuizSession(appDb.db, makeSessionInput());

      const summary = await submitQuizSession(appDb.db, {
        quizSessionId: "session-1",
        submittedAt: "2026-05-31T01:30:00.000Z",
        answers: makeAnswers(),
      });

      expect(summary).toEqual({
        totalQuestions: 20,
        correctCount: 14,
        incorrectCount: 6,
      });

      const [session] = await appDb.db
        .select()
        .from(quizSessions)
        .where(eq(quizSessions.id, "session-1"));
      expect(session).toMatchObject({
        status: "submitted",
        correctCount: 14,
        incorrectCount: 6,
        submittedAt: "2026-05-31T01:30:00.000Z",
      });

      const records = await appDb.db
        .select()
        .from(answerRecords)
        .orderBy(answerRecords.quizSessionQuestionId);
      expect(records).toHaveLength(20);
      expect(records[0]).toMatchObject({
        quizSessionId: "session-1",
        quizSessionQuestionId: "session-question-1",
        userId: "user-1",
        questionUrl: "https://example.test/questions/1",
        selectedAnswer: "A",
        correctAnswer: "A",
        isCorrect: 1,
        answeredAt: "2026-05-31T01:30:00.000Z",
      });

      const questionStats = await appDb.db
        .select()
        .from(userQuestionStats)
        .where(
          eq(userQuestionStats.questionUrl, "https://example.test/questions/3")
        );
      expect(questionStats[0]).toMatchObject({
        userId: "user-1",
        attemptCount: 1,
        correctCount: 0,
        incorrectCount: 1,
        lastAnsweredAt: "2026-05-31T01:30:00.000Z",
        lastIsCorrect: 0,
        activeWrong: 1,
        consecutiveCorrectAfterWrong: 0,
      });

      const topicStats = await appDb.db
        .select()
        .from(userTopicStats)
        .orderBy(userTopicStats.topicType, userTopicStats.topicKey);
      expect(topicStats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            userId: "user-1",
            topicKey: "technology",
            topicType: "category",
            attemptCount: 20,
            correctCount: 14,
            incorrectCount: 6,
            accuracy: 0.7,
            lastAnsweredAt: "2026-05-31T01:30:00.000Z",
          }),
          expect.objectContaining({
            userId: "user-1",
            topicKey: "network",
            topicType: "topic",
            attemptCount: 10,
            correctCount: 7,
            incorrectCount: 3,
            accuracy: 0.7,
            lastAnsweredAt: "2026-05-31T01:30:00.000Z",
          }),
        ])
      );
    } finally {
      appDb.close();
    }
  });

  it("rejects incomplete answers before writing and keeps the session created", async () => {
    const appDb = await createMigratedAppDb();

    try {
      await createQuizSession(appDb.db, makeSessionInput());

      await expect(
        submitQuizSession(appDb.db, {
          quizSessionId: "session-1",
          submittedAt: "2026-05-31T01:30:00.000Z",
          answers: makeAnswers().slice(0, 19),
        })
      ).rejects.toThrow("submitQuizSession requires exactly 20 answers");

      expect(await countAnswerRecords(appDb)).toBe(0);
      const [session] = await appDb.db
        .select()
        .from(quizSessions)
        .where(eq(quizSessions.id, "session-1"));
      expect(session.status).toBe("created");
      expect(session.submittedAt).toBeNull();
    } finally {
      appDb.close();
    }
  });

  it("returns the first result for an already submitted session without writing history or stats", async () => {
    const appDb = await createMigratedAppDb();

    try {
      await createQuizSession(appDb.db, makeSessionInput());
      const firstSummary = await submitQuizSession(appDb.db, {
        quizSessionId: "session-1",
        submittedAt: "2026-05-31T01:30:00.000Z",
        answers: makeAnswers(),
      });
      const answerRecordsBeforeRepeat = await appDb.db
        .select()
        .from(answerRecords)
        .orderBy(answerRecords.quizSessionQuestionId);
      const questionStatsBeforeRepeat = await appDb.db
        .select()
        .from(userQuestionStats)
        .orderBy(userQuestionStats.questionUrl);
      const topicStatsBeforeRepeat = await appDb.db
        .select()
        .from(userTopicStats)
        .orderBy(userTopicStats.topicType, userTopicStats.topicKey);

      const repeatedSummary = await submitQuizSession(appDb.db, {
        quizSessionId: "session-1",
        submittedAt: "2026-05-31T01:31:00.000Z",
        answers: makeAnswers({ selectedAnswer: "A" }),
      });

      expect(firstSummary).toEqual({
        totalQuestions: 20,
        correctCount: 14,
        incorrectCount: 6,
      });
      expect(repeatedSummary).toEqual(firstSummary);
      expect(
        await appDb.db
          .select()
          .from(answerRecords)
          .orderBy(answerRecords.quizSessionQuestionId)
      ).toEqual(answerRecordsBeforeRepeat);
      expect(
        await appDb.db
          .select()
          .from(userQuestionStats)
          .orderBy(userQuestionStats.questionUrl)
      ).toEqual(questionStatsBeforeRepeat);
      expect(
        await appDb.db
          .select()
          .from(userTopicStats)
          .orderBy(userTopicStats.topicType, userTopicStats.topicKey)
      ).toEqual(topicStatsBeforeRepeat);

      const [session] = await appDb.db
        .select()
        .from(quizSessions)
        .where(eq(quizSessions.id, "session-1"));
      expect(session).toMatchObject({
        status: "submitted",
        correctCount: 14,
        incorrectCount: 6,
        submittedAt: "2026-05-31T01:30:00.000Z",
      });
    } finally {
      appDb.close();
    }
  });

  it("throws a data integrity error when an already submitted session is missing summary counts", async () => {
    const appDb = await createMigratedAppDb();

    try {
      await createQuizSession(appDb.db, makeSessionInput());
      await submitQuizSession(appDb.db, {
        quizSessionId: "session-1",
        submittedAt: "2026-05-31T01:30:00.000Z",
        answers: makeAnswers(),
      });

      await appDb.db
        .update(quizSessions)
        .set({ correctCount: null })
        .where(eq(quizSessions.id, "session-1"));

      await expect(
        submitQuizSession(appDb.db, {
          quizSessionId: "session-1",
          submittedAt: "2026-05-31T01:31:00.000Z",
          answers: makeAnswers({ selectedAnswer: "A" }),
        })
      ).rejects.toThrow(
        "Quiz session session-1 is submitted but missing summary counts."
      );

      expect(await countAnswerRecords(appDb)).toBe(20);
    } finally {
      appDb.close();
    }
  });

  it("tracks active wrong questions until two consecutive correct answers", async () => {
    const appDb = await createMigratedAppDb();

    try {
      const questions = makeQuestions();
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        await createQuizSession(
          appDb.db,
          makeSessionInput({
            id: `session-${attempt}`,
            token: `token-${attempt}`,
            questions: questions.map((question) => ({
              ...question,
              id: `${question.id}-attempt-${attempt}`,
            })),
          })
        );
      }

      await submitQuizSession(appDb.db, {
        quizSessionId: "session-1",
        submittedAt: "2026-05-31T01:30:00.000Z",
        answers: makeAnswers().map((answer) =>
          answer.questionIndex === 1
            ? { ...answer, selectedAnswer: "B", correctAnswer: "A" }
            : { ...answer, selectedAnswer: "A", correctAnswer: "A" }
        ),
      });

      let [questionStat] = await appDb.db
        .select()
        .from(userQuestionStats)
        .where(
          eq(userQuestionStats.questionUrl, "https://example.test/questions/1")
        );
      expect(questionStat).toMatchObject({
        activeWrong: 1,
        consecutiveCorrectAfterWrong: 0,
      });

      await submitQuizSession(appDb.db, {
        quizSessionId: "session-2",
        submittedAt: "2026-05-31T01:31:00.000Z",
        answers: makeAnswers({ selectedAnswer: "A", correctAnswer: "A" }),
      });

      [questionStat] = await appDb.db
        .select()
        .from(userQuestionStats)
        .where(
          eq(userQuestionStats.questionUrl, "https://example.test/questions/1")
        );
      expect(questionStat).toMatchObject({
        activeWrong: 1,
        consecutiveCorrectAfterWrong: 1,
      });

      await submitQuizSession(appDb.db, {
        quizSessionId: "session-3",
        submittedAt: "2026-05-31T01:32:00.000Z",
        answers: makeAnswers({ selectedAnswer: "A", correctAnswer: "A" }),
      });

      [questionStat] = await appDb.db
        .select()
        .from(userQuestionStats)
        .where(
          eq(userQuestionStats.questionUrl, "https://example.test/questions/1")
        );
      expect(questionStat).toMatchObject({
        activeWrong: 0,
        consecutiveCorrectAfterWrong: 2,
      });
    } finally {
      appDb.close();
    }
  });
});

describe("quiz session expiry and cleanup", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs
        .splice(0)
        .map((tempDir) => rm(tempDir, { recursive: true, force: true }))
    );
  });

  it("finds expired created sessions but excludes future and submitted sessions", async () => {
    const appDb = await createMigratedAppDb();

    try {
      for (const session of [
        {
          id: "expired-created",
          token: "token-expired-created",
          expiresAt: "2026-05-31T01:00:00.000Z",
        },
        {
          id: "future-created",
          token: "token-future-created",
          expiresAt: "2026-05-31T03:00:00.000Z",
        },
        {
          id: "expired-submitted",
          token: "token-expired-submitted",
          expiresAt: "2026-05-31T01:00:00.000Z",
        },
      ]) {
        await createQuizSession(
          appDb.db,
          makeSessionInput({
            id: session.id,
            token: session.token,
            expiresAt: session.expiresAt,
            questions: makeQuestions().map((question) => ({
              ...question,
              id: `${session.id}-${question.questionIndex}`,
            })),
          })
        );
      }

      await submitQuizSession(appDb.db, {
        quizSessionId: "expired-submitted",
        submittedAt: "2026-05-31T01:30:00.000Z",
        answers: makeAnswers(),
      });

      const expiredSessions = await findExpiredUnsubmittedSessions(
        appDb.db,
        "2026-05-31T02:00:00.000Z"
      );

      expect(expiredSessions.map((session) => session.id)).toEqual([
        "expired-created",
      ]);
    } finally {
      appDb.close();
    }
  });

  it("deletes purgeable created and error sessions with questions but preserves submitted and future sessions", async () => {
    const appDb = await createMigratedAppDb();

    try {
      for (const session of [
        {
          id: "old-created",
          token: "token-old-created",
          status: "created",
          purgeAfterAt: "2026-05-30T00:00:00.000Z",
        },
        {
          id: "old-error",
          token: "token-old-error",
          status: "error",
          purgeAfterAt: "2026-05-30T00:00:00.000Z",
        },
        {
          id: "old-submitted",
          token: "token-old-submitted",
          status: "submitted",
          purgeAfterAt: "2026-05-30T00:00:00.000Z",
        },
        {
          id: "future-created",
          token: "token-future-created",
          status: "created",
          purgeAfterAt: "2026-06-02T00:00:00.000Z",
        },
      ]) {
        await createQuizSession(
          appDb.db,
          makeSessionInput({
            id: session.id,
            token: session.token,
            purgeAfterAt: session.purgeAfterAt,
            questions: makeQuestions().map((question) => ({
              ...question,
              id: `${session.id}-${question.questionIndex}`,
            })),
          })
        );

        if (session.status === "error") {
          await appDb.db
            .update(quizSessions)
            .set({ status: "error" })
            .where(eq(quizSessions.id, session.id));
        }

        if (session.status === "submitted") {
          await submitQuizSession(appDb.db, {
            quizSessionId: session.id,
            submittedAt: "2026-05-31T01:30:00.000Z",
            answers: makeAnswers(),
          });
        }
      }

      const deletedCount = await deletePurgeableUnsubmittedSessions(
        appDb.db,
        "2026-05-31T00:00:00.000Z"
      );

      expect(deletedCount).toBe(2);
      expect(await countSessionQuestions(appDb)).toBe(40);

      const remainingSessions = await appDb.db
        .select({
          id: quizSessions.id,
          status: quizSessions.status,
        })
        .from(quizSessions)
        .orderBy(quizSessions.id);
      expect(remainingSessions).toEqual([
        { id: "future-created", status: "created" },
        { id: "old-submitted", status: "submitted" },
      ]);
    } finally {
      appDb.close();
    }
  });
});

describe("findWeakTopicStats", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs
        .splice(0)
        .map((tempDir) => rm(tempDir, { recursive: true, force: true }))
    );
  });

  it("returns only topics below 60 percent accuracy with at least 3 attempts", async () => {
    const appDb = await createMigratedAppDb();

    try {
      await appDb.db.insert(userTopicStats).values([
        {
          userId: "user-1",
          topicKey: "network",
          topicType: "topic",
          attemptCount: 5,
          correctCount: 2,
          incorrectCount: 3,
          accuracy: 0.4,
          lastAnsweredAt: "2026-05-31T01:00:00.000Z",
        },
        {
          userId: "user-1",
          topicKey: "database",
          topicType: "topic",
          attemptCount: 3,
          correctCount: 1,
          incorrectCount: 2,
          accuracy: 0.3333333333333333,
          lastAnsweredAt: "2026-05-31T01:01:00.000Z",
        },
        {
          userId: "user-1",
          topicKey: "security",
          topicType: "topic",
          attemptCount: 5,
          correctCount: 3,
          incorrectCount: 2,
          accuracy: 0.6,
          lastAnsweredAt: "2026-05-31T01:02:00.000Z",
        },
        {
          userId: "user-1",
          topicKey: "algorithm",
          topicType: "topic",
          attemptCount: 2,
          correctCount: 0,
          incorrectCount: 2,
          accuracy: 0,
          lastAnsweredAt: "2026-05-31T01:03:00.000Z",
        },
      ]);

      const weakTopics = await findWeakTopicStats(appDb.db, "user-1");

      expect(weakTopics.map((topic) => topic.topicKey)).toEqual([
        "database",
        "network",
      ]);
    } finally {
      appDb.close();
    }
  });
});
