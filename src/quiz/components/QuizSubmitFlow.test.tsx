import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  ActiveQuizResponseDto,
  SubmittedQuizResponseDto,
} from "../api-schemas";
import { QuizActiveView } from "./QuizActiveView";
import { QuizPageClient } from "./QuizPageClient";

const activeQuiz20: ActiveQuizResponseDto = {
  status: "active",
  token: "quiz-token",
  totalQuestions: 20,
  questions: Array.from({ length: 20 }, (_, index) => ({
    index: index + 1,
    questionUrl: `https://www.fe-siken.com/kakomon/sample/q${index + 1}.html`,
    questionText: `\u554f\u984c${index + 1}\u306e\u672c\u6587`,
    choices: [{ label: "\u30a2", text: "\u9078\u629e\u80a2A" }],
    hasImages: false,
  })),
};

const submittedQuiz20: SubmittedQuizResponseDto = {
  status: "submitted",
  token: "quiz-token",
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
    highWeightTopicCount: 0,
  },
  questions: activeQuiz20.questions.map((question) => ({
    ...question,
    selectedAnswer: "\u30a2",
    correctAnswer: "\u30a2",
    isCorrect: true,
    explanation: "\u89e3\u8aac\u672c\u6587",
    sourceUrl: question.questionUrl,
  })),
};

function answerAllQuestions() {
  for (let index = 1; index <= 20; index += 1) {
    fireEvent.click(
      screen.getByRole("button", { name: "\u30a2 \u9078\u629e\u80a2A" })
    );
    if (index < 20) {
      fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    }
  }
}

describe("quiz submit flow", () => {
  it("shows a submit error when submission fails", async () => {
    const onSubmitAnswers = vi
      .fn()
      .mockRejectedValue(new Error("Failed to submit: invalid answer"));
    render(
      <QuizActiveView onSubmitAnswers={onSubmitAnswers} quiz={activeQuiz20} />
    );

    answerAllQuestions();
    fireEvent.click(screen.getByRole("button", { name: "提出する" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Failed to submit: invalid answer");
    expect(alert).toHaveClass("fixed");
    expect(alert).toHaveClass("top-4");
  }, 10_000);

  it("renders the result view after successful submit", async () => {
    const loadQuiz = vi.fn().mockResolvedValue(activeQuiz20);
    const submitAnswers = vi.fn().mockResolvedValue(submittedQuiz20);
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);

    render(
      <QuizPageClient
        loadQuiz={loadQuiz}
        submitAnswers={submitAnswers}
        token="quiz-token"
      />
    );

    await screen.findByText("\u554f\u984c1\u306e\u672c\u6587");

    answerAllQuestions();
    fireEvent.click(screen.getByRole("button", { name: "提出する" }));

    await waitFor(() => {
      expect(screen.getByTestId("quiz-result-view")).toBeInTheDocument();
    });
    expect(submitAnswers).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});
