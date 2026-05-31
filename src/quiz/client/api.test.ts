import { describe, expect, it, vi } from "vitest";
import type {
  ActiveQuizResponseDto,
  SubmittedQuizResponseDto,
} from "../api-schemas";
import { fetchQuiz, QuizApiClientError, submitQuiz } from "./api";

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

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      "content-type": "application/json",
    },
  });
}

describe("quiz API client", () => {
  it("fetches and parses active quiz responses", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(activeQuiz));

    await expect(fetchQuiz("quiz-token", fetchImpl)).resolves.toEqual(
      activeQuiz
    );
    expect(fetchImpl).toHaveBeenCalledWith("/api/quiz/quiz-token", {
      method: "GET",
      headers: {
        accept: "application/json",
      },
    });
  });

  it("fetches and parses submitted quiz responses", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(submittedQuiz));

    await expect(fetchQuiz("quiz-token", fetchImpl)).resolves.toEqual(
      submittedQuiz
    );
  });

  it("throws typed errors for API error responses", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "TOKEN_EXPIRED",
            message: "expired",
          },
        },
        { status: 410 }
      )
    );

    await expect(fetchQuiz("quiz-token", fetchImpl)).rejects.toMatchObject({
      name: "QuizApiClientError",
      statusCode: 410,
      response: {
        error: {
          code: "TOKEN_EXPIRED",
          message: "expired",
        },
      },
    });
  });

  it("rejects malformed success responses", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ status: "active" }));

    await expect(fetchQuiz("quiz-token", fetchImpl)).rejects.toBeInstanceOf(
      QuizApiClientError
    );
  });

  it("submits answers and parses submitted quiz responses", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(submittedQuiz));
    const request = {
      answers: Array.from({ length: 20 }, (_, index) => ({
        questionIndex: index + 1,
        selectedAnswer: "\u30a2",
      })),
    };

    await expect(submitQuiz("quiz-token", request, fetchImpl)).resolves.toEqual(
      submittedQuiz
    );
    expect(fetchImpl).toHaveBeenCalledWith("/api/quiz/quiz-token/submit", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });
  });
});
