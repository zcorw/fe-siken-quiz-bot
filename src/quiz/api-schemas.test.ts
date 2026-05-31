import { describe, expect, it } from "vitest";

import {
  activeQuizResponseSchema,
  apiErrorResponseSchema,
  submittedQuizResponseSchema,
  submitQuizRequestSchema,
} from "./api-schemas";

describe("quiz API schemas", () => {
  it("validates active quiz responses without hidden answer fields", () => {
    const activeResponse = activeQuizResponseSchema.parse({
      status: "active",
      token: "token-1",
      totalQuestions: 20,
      questions: [
        {
          index: 1,
          questionUrl: "https://example.test/q1",
          questionText: "問題文",
          choices: [{ label: "ア", text: "選択肢" }],
          hasImages: false,
        },
      ],
    });

    expect(activeResponse.questions[0]).not.toHaveProperty("correctAnswer");
    expect(activeResponse.questions[0]).not.toHaveProperty("explanation");
    expect(activeResponse.questions[0]).not.toHaveProperty("sourceUrl");
  });

  it("validates submitted quiz responses with result details", () => {
    expect(
      submittedQuizResponseSchema.parse({
        status: "submitted",
        token: "token-1",
        summary: {
          totalQuestions: 20,
          correctCount: 14,
          incorrectCount: 6,
          accuracy: 0.7,
        },
        selectionSummary: {
          requestedScopeCount: 15,
          reinforcementCount: 5,
          wrongQuestionCount: 1,
          weakTopicCount: 2,
          highWeightTopicCount: 2,
        },
        questions: [
          {
            index: 1,
            questionUrl: "https://example.test/q1",
            questionText: "問題文",
            choices: [{ label: "ア", text: "選択肢" }],
            hasImages: false,
            selectedAnswer: "ア",
            correctAnswer: "ア",
            isCorrect: true,
            explanation: "解説",
            sourceUrl: "https://example.test/q1",
          },
        ],
      })
    ).toMatchObject({ status: "submitted" });
  });

  it("validates submit requests with exactly 20 answers", () => {
    expect(
      submitQuizRequestSchema.parse({
        answers: Array.from({ length: 20 }, (_, index) => ({
          questionIndex: index + 1,
          selectedAnswer: "ア",
        })),
      }).answers
    ).toHaveLength(20);

    expect(() =>
      submitQuizRequestSchema.parse({
        answers: [{ questionIndex: 1, selectedAnswer: "ア" }],
      })
    ).toThrow();
  });

  it("validates stable API error responses", () => {
    expect(
      apiErrorResponseSchema.parse({
        error: {
          code: "INVALID_TOKEN",
          message: "Token not found.",
        },
      })
    ).toEqual({
      error: {
        code: "INVALID_TOKEN",
        message: "Token not found.",
      },
    });
  });

  it("rejects HTML-specific fields so API responses stay Markdown-only", () => {
    expect(() =>
      activeQuizResponseSchema.parse({
        status: "active",
        token: "token-1",
        totalQuestions: 20,
        questions: [
          {
            index: 1,
            questionUrl: "https://example.test/q1",
            questionText: "![diagram](/assets/q1.png)",
            questionHtml: "<img src='/assets/q1.png'>",
            choices: [{ label: "ア", text: "選択肢" }],
            hasImages: true,
          },
        ],
      })
    ).toThrow();

    expect(() =>
      submittedQuizResponseSchema.parse({
        status: "submitted",
        token: "token-1",
        summary: {
          totalQuestions: 20,
          correctCount: 20,
          incorrectCount: 0,
          accuracy: 1,
        },
        selectionSummary: {
          requestedScopeCount: 15,
          reinforcementCount: 5,
          wrongQuestionCount: 0,
          weakTopicCount: 0,
          highWeightTopicCount: 5,
        },
        questions: [
          {
            index: 1,
            questionUrl: "https://example.test/q1",
            questionText: "Markdown question",
            choices: [{ label: "ア", text: "選択肢" }],
            hasImages: false,
            selectedAnswer: "ア",
            correctAnswer: "ア",
            isCorrect: true,
            explanation: "Markdown explanation",
            explanationHtml: "<p>unsafe</p>",
            sourceUrl: "https://example.test/q1",
          },
        ],
      })
    ).toThrow();
  });
});
