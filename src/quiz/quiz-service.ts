import type Database from "better-sqlite3";
import { asc, eq } from "drizzle-orm";

import type { AppDrizzleDb } from "@/db/app/client";
import { quizSessionQuestions, quizSessions } from "@/db/app/schema";
import { getQuestionDetail } from "@/db/question-bank/queries";
import { ApiError } from "@/lib/api-response";
import type { ActiveQuizResponseDto } from "./api-schemas";

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
}: LoadQuizByTokenInput): Promise<ActiveQuizResponseDto> {
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

  if (session.status !== "created") {
    throw new ApiError(
      "QUIZ_ALREADY_SUBMITTED",
      409,
      "Quiz already submitted."
    );
  }

  const sessionQuestions = await appDb
    .select()
    .from(quizSessionQuestions)
    .where(eq(quizSessionQuestions.quizSessionId, session.id))
    .orderBy(asc(quizSessionQuestions.questionIndex));

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
