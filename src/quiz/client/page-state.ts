import type {
  ActiveQuizResponseDto,
  ApiErrorResponseDto,
  SubmittedQuizResponseDto,
} from "../api-schemas";

export type QuizPageState =
  | {
      status: "loading";
    }
  | {
      status: "active";
      quiz: ActiveQuizResponseDto;
    }
  | {
      status: "submitted";
      quiz: SubmittedQuizResponseDto;
    }
  | {
      status: "not_found" | "expired" | "error";
      message: string;
    };

export const initialQuizPageState: QuizPageState = {
  status: "loading",
};

export function createQuizPageReadyState(
  quiz: ActiveQuizResponseDto | SubmittedQuizResponseDto
): QuizPageState {
  if (quiz.status === "submitted") {
    return {
      status: "submitted",
      quiz,
    };
  }

  return {
    status: "active",
    quiz,
  };
}

export function createQuizPageErrorState(
  errorResponse: ApiErrorResponseDto
): QuizPageState {
  switch (errorResponse.error.code) {
    case "INVALID_TOKEN":
      return {
        status: "not_found",
        message: "このリンクは無効です",
      };
    case "TOKEN_EXPIRED":
      return {
        status: "expired",
        message: "このリンクは期限切れです",
      };
    default:
      return {
        status: "error",
        message: "読み込みに失敗しました",
      };
  }
}
