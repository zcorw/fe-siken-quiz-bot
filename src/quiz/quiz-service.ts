import type Database from "better-sqlite3";
import { asc, eq } from "drizzle-orm";

import type { AppDrizzleDb } from "@/db/app/client";
import {
  answerRecords,
  quizSessionQuestions,
  quizSessions,
} from "@/db/app/schema";
import { getQuestionDetail } from "@/db/question-bank/queries";
import { ApiError } from "@/lib/api-response";
import {
  selectionSummaryDtoSchema,
  type ActiveQuizResponseDto,
  type SubmittedQuizResponseDto,
} from "./api-schemas";

export interface LoadQuizByTokenInput {
  appDb: AppDrizzleDb;
  questionDb: Database.Database;
  token: string;
  nowIso: string;
}

export async function loadQuizByToken({
  appDb,
  questionDb,
  token,
  nowIso,
}: LoadQuizByTokenInput): Promise<
  ActiveQuizResponseDto | SubmittedQuizResponseDto
> {
  const [session] = await appDb
    .select()
    .from(quizSessions)
    .where(eq(quizSessions.token, token));

  if (session === undefined) {
    throw new ApiError("INVALID_TOKEN", 404, "Token not found.");
  }

  if (
    session.status === "created" &&
    session.expiresAt !== null &&
    session.expiresAt <= nowIso
  ) {
    throw new ApiError("TOKEN_EXPIRED", 410, "Token expired.");
  }

  const sessionQuestions = await appDb
    .select()
    .from(quizSessionQuestions)
    .where(eq(quizSessionQuestions.quizSessionId, session.id))
    .orderBy(asc(quizSessionQuestions.questionIndex));

  if (session.status === "submitted") {
    const answerRows = await appDb
      .select()
      .from(answerRecords)
      .where(eq(answerRecords.quizSessionId, session.id));
    const answersBySessionQuestionId = new Map(
      answerRows.map((answer) => [answer.quizSessionQuestionId, answer])
    );

    const correctCount = session.correctCount ?? 0;
    const incorrectCount = session.incorrectCount ?? 0;

    return {
      status: "submitted",
      token: session.token,
      summary: {
        totalQuestions: session.totalQuestions,
        correctCount,
        incorrectCount,
        accuracy:
          session.totalQuestions === 0
            ? 0
            : correctCount / session.totalQuestions,
      },
      selectionSummary: parseSelectionSummary(session.selectionSummaryJson),
      questions: sessionQuestions.map((sessionQuestion) => {
        const detail = getQuestionDetail(
          questionDb,
          sessionQuestion.questionUrl
        );
        const answer = answersBySessionQuestionId.get(sessionQuestion.id);

        if (detail === null || answer === undefined) {
          throw new ApiError(
            "INVALID_TOKEN",
            500,
            "Question result not found."
          );
        }

        return {
          index: sessionQuestion.questionIndex,
          questionUrl: detail.questionUrl,
          questionText: detail.questionText,
          choices: detail.choices,
          hasImages: detail.hasImages,
          selectedAnswer: answer.selectedAnswer,
          correctAnswer: answer.correctAnswer,
          isCorrect: answer.isCorrect === 1,
          explanation: detail.explanation,
          sourceUrl: detail.sourceUrl,
        };
      }),
    };
  }

  if (session.status !== "created") {
    throw new ApiError("INVALID_TOKEN", 500, "Invalid quiz session status.");
  }

  return {
    status: "active",
    token: session.token,
    totalQuestions: session.totalQuestions,
    questions: sessionQuestions.map((sessionQuestion) => {
      const detail = getQuestionDetail(questionDb, sessionQuestion.questionUrl);

      if (detail === null) {
        throw new ApiError("INVALID_TOKEN", 500, "Question detail not found.");
      }

      return {
        index: sessionQuestion.questionIndex,
        questionUrl: detail.questionUrl,
        questionText: detail.questionText,
        choices: detail.choices,
        hasImages: detail.hasImages,
      };
    }),
  };
}

function parseSelectionSummary(selectionSummaryJson: string | null) {
  const parsed =
    selectionSummaryJson === null
      ? {}
      : (JSON.parse(selectionSummaryJson) as Record<string, unknown>);

  return selectionSummaryDtoSchema.parse({
    requestedScopeCount: parsed.requestedScopeCount ?? 0,
    reinforcementCount: parsed.reinforcementCount ?? 0,
    wrongQuestionCount: parsed.wrongQuestionCount ?? 0,
    weakTopicCount: parsed.weakTopicCount ?? 0,
    highWeightTopicCount: parsed.highWeightTopicCount ?? 0,
  });
}
