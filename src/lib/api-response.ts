export type ApiErrorCode =
  | "INVALID_TOKEN"
  | "TOKEN_EXPIRED"
  | "QUIZ_ALREADY_SUBMITTED"
  | "INCOMPLETE_ANSWERS"
  | "INVALID_ANSWER"
  | "QUESTION_NOT_IN_SESSION"
  | "SUBMIT_FAILED"
  | "SCOPE_NO_MATCH"
  | "AI_PROVIDER_UNAVAILABLE"
  | "TELEGRAM_SEND_FAILED";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
  };
};

export function jsonError(error: ApiError, init?: ResponseInit): Response {
  return Response.json(
    {
      error: {
        code: error.code,
        message: error.message,
      },
    } satisfies ApiErrorBody,
    {
      ...init,
      status: error.status,
    }
  );
}

export function jsonSuccess<T>(body: T, init?: ResponseInit): Response {
  return Response.json(body, init);
}
