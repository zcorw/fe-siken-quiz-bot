import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  ActiveQuizResponseDto,
  SubmittedQuizResponseDto,
} from "../api-schemas";
import { QuizPageClient } from "./QuizPageClient";

const quiz: ActiveQuizResponseDto = {
  status: "active",
  token: "quiz-token",
  totalQuestions: 1,
  questions: [
    {
      index: 1,
      questionUrl: "https://www.fe-siken.com/kakomon/sample/q1.html",
      questionText: "問1の本文",
      choices: [{ label: "ア", text: "選択肢A" }],
      hasImages: false,
    },
  ],
};

const submittedQuiz: SubmittedQuizResponseDto = {
  status: "submitted",
  token: "quiz-token",
  summary: {
    totalQuestions: 1,
    correctCount: 1,
    incorrectCount: 0,
    accuracy: 1,
  },
  selectionSummary: {
    requestedScopeCount: 1,
    reinforcementCount: 0,
    wrongQuestionCount: 0,
    weakTopicCount: 0,
    highWeightTopicCount: 0,
  },
  questions: [
    {
      ...quiz.questions[0],
      selectedAnswer: "ア",
      correctAnswer: "ア",
      isCorrect: true,
      explanation: "解説本文",
      sourceUrl: "https://www.fe-siken.com/kakomon/sample/q1.html",
    },
  ],
};

describe("QuizPageClient", () => {
  it("loads a quiz by token and renders the active view", async () => {
    const loadQuiz = vi.fn().mockResolvedValue(quiz);

    render(<QuizPageClient loadQuiz={loadQuiz} token="quiz-token" />);

    expect(screen.getByText("読み込み中")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("問1の本文")).toBeInTheDocument();
    });
    expect(loadQuiz).toHaveBeenCalledWith("quiz-token");
  });

  it("loads a submitted quiz by token and renders the result view", async () => {
    const loadQuiz = vi.fn().mockResolvedValue(submittedQuiz);

    render(<QuizPageClient loadQuiz={loadQuiz} token="quiz-token" />);

    await waitFor(() => {
      expect(screen.getByTestId("quiz-result-view")).toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: "結果" })).toBeInTheDocument();
    expect(screen.getAllByText("正答率")).toHaveLength(2);
    expect(screen.getAllByText("100%")).toHaveLength(2);
  });
});
