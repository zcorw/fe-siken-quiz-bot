import type Database from "better-sqlite3";
import { asc, eq } from "drizzle-orm";

import type { AppDrizzleDb } from "@/db/app/client";
import { submitQuizSession } from "@/db/app/repositories/quiz-sessions";
import { quizSessionQuestions, quizSessions } from "@/db/app/schema";
import { getQuestionDetail } from "@/db/question-bank/queries";
import { ApiError } from "@/lib/api-response";
import {
  submitQuizRequestSchema,
  type SubmittedQuizResponseDto,
  type SubmitQuizRequestDto,
} from "./api-schemas";
import { loadQuizByToken } from "./quiz-service";

export interface ValidateSubmitQuizRequestInput {
  appDb: AppDrizzleDb;
  questionDb: Database.Database;
  token: string;
  request: unknown;
  nowIso: string;
}

export interface SubmitQuizByTokenInput {
  appDb: AppDrizzleDb;
  questionDb: Database.Database;
  token: string;
  request: unknown;
  submittedAt: string;
}

export interface ValidatedSubmitQuizRequest {
  quizSessionId: string;
  answers: Array<{
    questionIndex: number;
    selectedAnswer: string;
    correctAnswer: string;
  }>;
}

export async function submitQuizByToken({
  appDb,
  questionDb,
  token,
  request,
  submittedAt,
}: SubmitQuizByTokenInput): Promise<SubmittedQuizResponseDto> {
  const existingResponse = await loadQuizByToken({
    appDb,
    questionDb,
    token,
    nowIso: submittedAt,
  });

  if (existingResponse.status === "submitted") {
    return existingResponse;
  }

  const validated = await validateSubmitQuizRequest({
    appDb,
    questionDb,
    token,
    request,
    nowIso: submittedAt,
  });

  await submitQuizSession(appDb, {
    quizSessionId: validated.quizSessionId,
    submittedAt,
    answers: validated.answers,
  });

  const response = await loadQuizByToken({
    appDb,
    questionDb,
    token,
    nowIso: submittedAt,
  });

  if (response.status !== "submitted") {
    throw new ApiError("SUBMIT_FAILED", 500, "Submitted result not found.");
  }

  return response;
}

export async function validateSubmitQuizRequest({
  appDb,
  questionDb,
  token,
  request,
  nowIso,
}: ValidateSubmitQuizRequestInput): Promise<ValidatedSubmitQuizRequest> {
  const parsedRequest = parseSubmitRequest(request);
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
  const sessionQuestionsByIndex = new Map(
    sessionQuestions.map((question) => [question.questionIndex, question])
  );

  const submittedIndexes = new Set(
    parsedRequest.answers.map((answer) => answer.questionIndex)
  );
  if (
    submittedIndexes.size !== sessionQuestions.length ||
    submittedIndexes.size !== 20
  ) {
    throw new ApiError(
      "QUESTION_NOT_IN_SESSION",
      422,
      "Answers must reference every question in the session."
    );
  }

  return {
    quizSessionId: session.id,
    answers: parsedRequest.answers.map((answer) => {
      const sessionQuestion = sessionQuestionsByIndex.get(answer.questionIndex);

      if (sessionQuestion === undefined) {
        throw new ApiError(
          "QUESTION_NOT_IN_SESSION",
          422,
          "Answer references a question outside this session."
        );
      }

      const detail = getQuestionDetail(questionDb, sessionQuestion.questionUrl);

      if (detail === null || detail.answer === null) {
        throw new ApiError(
          "QUIZ_LOAD_FAILED",
          500,
          "Question answer could not be loaded."
        );
      }

      if (
        !detail.choices.some((choice) => choice.label === answer.selectedAnswer)
      ) {
        throw new ApiError(
          "INVALID_ANSWER",
          422,
          "Selected answer is not a valid choice."
        );
      }

      return {
        questionIndex: answer.questionIndex,
        selectedAnswer: answer.selectedAnswer,
        correctAnswer: detail.answer,
      };
    }),
  };
}

function parseSubmitRequest(request: unknown): SubmitQuizRequestDto {
  const result = submitQuizRequestSchema.safeParse(request);

  if (!result.success) {
    throw new ApiError(
      "INCOMPLETE_ANSWERS",
      422,
      "Exactly 20 answers are required."
    );
  }

  return result.data;
}
