import { describe, expect, it } from "vitest";
import type {
  ActiveQuizResponseDto,
  ApiErrorResponseDto,
  SubmittedQuizResponseDto,
} from "../api-schemas";
import {
  createQuizPageErrorState,
  createQuizPageReadyState,
} from "./page-state";

const activeQuiz: ActiveQuizResponseDto = {
  status: "active",
  token: "quiz-token",
  totalQuestions: 20,
  questions: [],
};

const submittedQuiz: SubmittedQuizResponseDto = {
  status: "submitted",
  token: "quiz-token",
  summary: {
    totalQuestions: 20,
    correctCount: 14,
    incorrectCount: 6,
    accuracy: 0.7,
  },
  selectionSummary: {
    requestedScopeCount: 15,
    reinforcementCount: 5,
    wrongQuestionCount: 2,
    weakTopicCount: 2,
    highWeightTopicCount: 1,
  },
  questions: [],
};

function apiError(
  code: ApiErrorResponseDto["error"]["code"]
): ApiErrorResponseDto {
  return {
    error: {
      code,
      message: code,
    },
  };
}

describe("quiz page state", () => {
  it("maps active quiz responses to active page state", () => {
    expect(createQuizPageReadyState(activeQuiz)).toEqual({
      status: "active",
      quiz: activeQuiz,
    });
  });

  it("maps submitted quiz responses to submitted page state", () => {
    expect(createQuizPageReadyState(submittedQuiz)).toEqual({
      status: "submitted",
      quiz: submittedQuiz,
    });
  });

  it("maps invalid token API errors to not_found page state", () => {
    expect(createQuizPageErrorState(apiError("INVALID_TOKEN"))).toEqual({
      status: "not_found",
      message: "このリンクは無効です",
    });
  });

  it("maps expired token API errors to expired page state", () => {
    expect(createQuizPageErrorState(apiError("TOKEN_EXPIRED"))).toEqual({
      status: "expired",
      message: "このリンクは期限切れです",
    });
  });

  it("maps other API errors to generic error page state", () => {
    expect(createQuizPageErrorState(apiError("QUIZ_LOAD_FAILED"))).toEqual({
      status: "error",
      message: "読み込みに失敗しました",
    });
  });
});
