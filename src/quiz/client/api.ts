import { z } from "zod";
import {
  activeQuizResponseSchema,
  apiErrorResponseSchema,
  type ActiveQuizResponseDto,
  type ApiErrorResponseDto,
  type SubmitQuizRequestDto,
  type SubmittedQuizResponseDto,
  submitQuizRequestSchema,
  submittedQuizResponseSchema,
} from "../api-schemas";

export type QuizResponseDto = ActiveQuizResponseDto | SubmittedQuizResponseDto;

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const quizResponseSchema = z.union([
  activeQuizResponseSchema,
  submittedQuizResponseSchema,
]);

const fallbackErrorResponse: ApiErrorResponseDto = {
  error: {
    code: "QUIZ_LOAD_FAILED",
    message: "Quiz API response could not be parsed.",
  },
};

export class QuizApiClientError extends Error {
  readonly response: ApiErrorResponseDto;
  readonly statusCode: number;

  constructor(response: ApiErrorResponseDto, statusCode: number) {
    super(response.error.message);
    this.name = "QuizApiClientError";
    this.response = response;
    this.statusCode = statusCode;
  }
}

export async function fetchQuiz(
  token: string,
  fetchImpl: FetchLike = globalThis.fetch
): Promise<QuizResponseDto> {
  const response = await fetchImpl(`/api/quiz/${encodeURIComponent(token)}`, {
    method: "GET",
    headers: {
      accept: "application/json",
    },
  });

  const body: unknown = await response.json();

  if (!response.ok) {
    throw new QuizApiClientError(parseApiErrorResponse(body), response.status);
  }

  const parsed = quizResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new QuizApiClientError(fallbackErrorResponse, response.status);
  }

  return parsed.data;
}

export async function submitQuiz(
  token: string,
  request: SubmitQuizRequestDto,
  fetchImpl: FetchLike = globalThis.fetch
): Promise<SubmittedQuizResponseDto> {
  const validatedRequest = submitQuizRequestSchema.parse(request);
  const response = await fetchImpl(
    `/api/quiz/${encodeURIComponent(token)}/submit`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(validatedRequest),
    }
  );

  const body: unknown = await response.json();

  if (!response.ok) {
    throw new QuizApiClientError(parseApiErrorResponse(body), response.status);
  }

  const parsed = submittedQuizResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new QuizApiClientError(fallbackErrorResponse, response.status);
  }

  return parsed.data;
}

function parseApiErrorResponse(body: unknown): ApiErrorResponseDto {
  const parsed = apiErrorResponseSchema.safeParse(body);
  if (!parsed.success) {
    return fallbackErrorResponse;
  }

  return parsed.data;
}
