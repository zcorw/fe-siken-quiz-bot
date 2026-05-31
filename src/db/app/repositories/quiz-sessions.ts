import { eq, sql } from "drizzle-orm";
import type { AppDrizzleDb } from "../client";
import {
  answerRecords,
  quizSessionQuestions,
  quizSessions,
  userQuestionStats,
  userTopicStats,
} from "../schema";

type JsonPrimitive = string | number | boolean | null;
type JsonValue =
  | JsonPrimitive
  | { readonly [key: string]: JsonValue }
  | readonly JsonValue[];

export interface CreateQuizSessionQuestionInput {
  id: string;
  questionUrl: string;
  questionIndex: number;
  sourceType: string;
  sourceTopic: string | null;
  sourceCategory: string | null;
  selectionReason: string | null;
}

export interface CreateQuizSessionInput {
  id: string;
  token: string;
  userId: string;
  rawScopeInput: string;
  matchedScopeJson: string | JsonValue;
  selectionSummaryJson: string | JsonValue;
  createdAt: string;
  expiresAt: string;
  purgeAfterAt: string;
  questions: CreateQuizSessionQuestionInput[];
}

export interface SubmitQuizSessionAnswerInput {
  questionIndex: number;
  selectedAnswer: string;
  correctAnswer: string;
}

export interface SubmitQuizSessionInput {
  quizSessionId: string;
  submittedAt: string;
  answers: SubmitQuizSessionAnswerInput[];
}

export interface SubmitQuizSessionSummary {
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
}

function serializeJson(value: JsonValue): string {
  return JSON.stringify(value);
}

function validateQuestionIndexes(
  questions: CreateQuizSessionQuestionInput[]
): void {
  const indexes = questions
    .map((question) => question.questionIndex)
    .sort((left, right) => left - right);

  const hasRequiredSequence = indexes.every(
    (questionIndex, index) => questionIndex === index + 1
  );

  if (!hasRequiredSequence) {
    throw new Error(
      "createQuizSession question indexes must be exactly 1 through 20."
    );
  }
}

export async function createQuizSession(
  appDb: AppDrizzleDb,
  input: CreateQuizSessionInput
): Promise<void> {
  if (input.questions.length !== 20) {
    throw new Error(
      `createQuizSession requires exactly 20 questions, received ${input.questions.length}.`
    );
  }
  validateQuestionIndexes(input.questions);

  appDb.transaction((tx) => {
    tx.insert(quizSessions)
      .values({
        id: input.id,
        token: input.token,
        userId: input.userId,
        rawScopeInput: input.rawScopeInput,
        matchedScopeJson: serializeJson(input.matchedScopeJson),
        selectionSummaryJson: serializeJson(input.selectionSummaryJson),
        status: "created",
        totalQuestions: 20,
        correctCount: null,
        incorrectCount: null,
        submittedAt: null,
        createdAt: input.createdAt,
        expiresAt: input.expiresAt,
        purgeAfterAt: input.purgeAfterAt,
      })
      .run();

    tx.insert(quizSessionQuestions)
      .values(
        input.questions.map((question) => ({
          id: question.id,
          quizSessionId: input.id,
          questionUrl: question.questionUrl,
          questionIndex: question.questionIndex,
          sourceType: question.sourceType,
          sourceTopic: question.sourceTopic,
          sourceCategory: question.sourceCategory,
          selectionReason: question.selectionReason,
        }))
      )
      .run();
  });
}

function validateSubmitAnswers(answers: SubmitQuizSessionAnswerInput[]): void {
  if (answers.length !== 20) {
    throw new Error(
      `submitQuizSession requires exactly 20 answers, received ${answers.length}.`
    );
  }

  const indexes = answers
    .map((answer) => answer.questionIndex)
    .sort((left, right) => left - right);
  const hasRequiredSequence = indexes.every(
    (questionIndex, index) => questionIndex === index + 1
  );

  if (!hasRequiredSequence) {
    throw new Error(
      "submitQuizSession answer question indexes must be exactly 1 through 20."
    );
  }
}

function getSubmittedSessionSummary(session: {
  id: string;
  totalQuestions: number | null;
  correctCount: number | null;
  incorrectCount: number | null;
}): SubmitQuizSessionSummary {
  if (
    session.totalQuestions === null ||
    session.correctCount === null ||
    session.incorrectCount === null
  ) {
    throw new Error(
      `Quiz session ${session.id} is submitted but missing summary counts.`
    );
  }

  return {
    totalQuestions: session.totalQuestions,
    correctCount: session.correctCount,
    incorrectCount: session.incorrectCount,
  };
}

export async function submitQuizSession(
  appDb: AppDrizzleDb,
  input: SubmitQuizSessionInput
): Promise<SubmitQuizSessionSummary> {
  validateSubmitAnswers(input.answers);

  return appDb.transaction((tx) => {
    const session = tx
      .select()
      .from(quizSessions)
      .where(eq(quizSessions.id, input.quizSessionId))
      .get();

    if (!session) {
      throw new Error(`Quiz session ${input.quizSessionId} was not found.`);
    }

    if (session.status === "submitted") {
      return getSubmittedSessionSummary(session);
    }

    if (session.status !== "created") {
      throw new Error(
        `Quiz session ${input.quizSessionId} has unsupported status ${session.status}.`
      );
    }

    const questions = tx
      .select()
      .from(quizSessionQuestions)
      .where(eq(quizSessionQuestions.quizSessionId, input.quizSessionId))
      .all();

    if (questions.length !== 20) {
      throw new Error(
        `Quiz session ${input.quizSessionId} must have exactly 20 questions before submit.`
      );
    }

    const questionsByIndex = new Map(
      questions.map((question) => [question.questionIndex, question])
    );
    const answersByIndex = new Map(
      input.answers.map((answer) => [answer.questionIndex, answer])
    );

    for (const answer of input.answers) {
      if (!questionsByIndex.has(answer.questionIndex)) {
        throw new Error(
          `Answer question index ${answer.questionIndex} does not belong to quiz session ${input.quizSessionId}.`
        );
      }
    }

    const answerRows = questions.map((question) => {
      const answer = answersByIndex.get(question.questionIndex);

      if (!answer) {
        throw new Error(
          `Missing answer for quiz session question index ${question.questionIndex}.`
        );
      }

      const isCorrect = answer.selectedAnswer === answer.correctAnswer;

      return {
        id: `${question.id}:answer`,
        quizSessionId: input.quizSessionId,
        quizSessionQuestionId: question.id,
        userId: session.userId,
        questionUrl: question.questionUrl,
        selectedAnswer: answer.selectedAnswer,
        correctAnswer: answer.correctAnswer,
        isCorrect: isCorrect ? 1 : 0,
        answeredAt: input.submittedAt,
        sourceTopic: question.sourceTopic,
        sourceCategory: question.sourceCategory,
      };
    });

    const correctCount = answerRows.filter((answer) => answer.isCorrect).length;
    const incorrectCount = 20 - correctCount;

    tx.insert(answerRecords)
      .values(
        answerRows.map((answer) => ({
          id: answer.id,
          quizSessionId: answer.quizSessionId,
          quizSessionQuestionId: answer.quizSessionQuestionId,
          userId: answer.userId,
          questionUrl: answer.questionUrl,
          selectedAnswer: answer.selectedAnswer,
          correctAnswer: answer.correctAnswer,
          isCorrect: answer.isCorrect,
          answeredAt: answer.answeredAt,
        }))
      )
      .run();

    tx.update(quizSessions)
      .set({
        status: "submitted",
        correctCount,
        incorrectCount,
        submittedAt: input.submittedAt,
      })
      .where(eq(quizSessions.id, input.quizSessionId))
      .run();

    for (const answer of answerRows) {
      tx.insert(userQuestionStats)
        .values({
          userId: answer.userId,
          questionUrl: answer.questionUrl,
          attemptCount: 1,
          correctCount: answer.isCorrect,
          incorrectCount: answer.isCorrect ? 0 : 1,
          lastAnsweredAt: input.submittedAt,
          lastIsCorrect: answer.isCorrect,
          activeWrong: answer.isCorrect ? 0 : 1,
          consecutiveCorrectAfterWrong: 0,
        })
        .onConflictDoUpdate({
          target: [userQuestionStats.userId, userQuestionStats.questionUrl],
          set: {
            attemptCount: sql`${userQuestionStats.attemptCount} + 1`,
            correctCount: sql`${userQuestionStats.correctCount} + ${answer.isCorrect}`,
            incorrectCount: sql`${userQuestionStats.incorrectCount} + ${
              answer.isCorrect ? 0 : 1
            }`,
            lastAnsweredAt: input.submittedAt,
            lastIsCorrect: answer.isCorrect,
            activeWrong: sql`case
              when ${answer.isCorrect} = 0 then 1
              when ${userQuestionStats.activeWrong} = 1
                and ${userQuestionStats.consecutiveCorrectAfterWrong} + 1 >= 2 then 0
              else ${userQuestionStats.activeWrong}
            end`,
            consecutiveCorrectAfterWrong: sql`case
              when ${answer.isCorrect} = 0 then 0
              when ${userQuestionStats.activeWrong} = 1 then ${userQuestionStats.consecutiveCorrectAfterWrong} + 1
              else 0
            end`,
          },
        })
        .run();
    }

    const topicStats = new Map<
      string,
      {
        topicKey: string;
        topicType: string;
        attemptCount: number;
        correctCount: number;
      }
    >();

    for (const answer of answerRows) {
      for (const topic of [
        answer.sourceTopic
          ? { topicKey: answer.sourceTopic, topicType: "topic" }
          : null,
        answer.sourceCategory
          ? { topicKey: answer.sourceCategory, topicType: "category" }
          : null,
      ]) {
        if (!topic) {
          continue;
        }

        const key = `${topic.topicType}:${topic.topicKey}`;
        const current = topicStats.get(key) ?? {
          ...topic,
          attemptCount: 0,
          correctCount: 0,
        };

        current.attemptCount += 1;
        current.correctCount += answer.isCorrect;
        topicStats.set(key, current);
      }
    }

    for (const topicStat of topicStats.values()) {
      const incorrectTopicCount =
        topicStat.attemptCount - topicStat.correctCount;

      tx.insert(userTopicStats)
        .values({
          userId: session.userId,
          topicKey: topicStat.topicKey,
          topicType: topicStat.topicType,
          attemptCount: topicStat.attemptCount,
          correctCount: topicStat.correctCount,
          incorrectCount: incorrectTopicCount,
          accuracy: topicStat.correctCount / topicStat.attemptCount,
          lastAnsweredAt: input.submittedAt,
        })
        .onConflictDoUpdate({
          target: [
            userTopicStats.userId,
            userTopicStats.topicKey,
            userTopicStats.topicType,
          ],
          set: {
            attemptCount: sql`${userTopicStats.attemptCount} + ${topicStat.attemptCount}`,
            correctCount: sql`${userTopicStats.correctCount} + ${topicStat.correctCount}`,
            incorrectCount: sql`${userTopicStats.incorrectCount} + ${incorrectTopicCount}`,
            accuracy: sql`(${userTopicStats.correctCount} + ${topicStat.correctCount}) * 1.0 / (${userTopicStats.attemptCount} + ${topicStat.attemptCount})`,
            lastAnsweredAt: input.submittedAt,
          },
        })
        .run();
    }

    return {
      totalQuestions: 20,
      correctCount,
      incorrectCount,
    };
  });
}
