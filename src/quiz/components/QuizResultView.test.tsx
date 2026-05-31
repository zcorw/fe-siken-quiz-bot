import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SubmittedQuizResponseDto } from "../api-schemas";
import { QuizResultView } from "./QuizResultView";

const submittedQuiz: SubmittedQuizResponseDto = {
  status: "submitted",
  token: "quiz-token",
  summary: {
    totalQuestions: 2,
    correctCount: 1,
    incorrectCount: 1,
    accuracy: 0.5,
  },
  selectionSummary: {
    requestedScopeCount: 1,
    reinforcementCount: 1,
    wrongQuestionCount: 1,
    weakTopicCount: 0,
    highWeightTopicCount: 0,
  },
  questions: [
    {
      index: 1,
      questionUrl: "https://www.fe-siken.com/kakomon/sample/q1.html",
      questionText: "問1の本文",
      choices: [{ label: "ア", text: "選択肢A" }],
      hasImages: false,
      selectedAnswer: "ア",
      correctAnswer: "ア",
      isCorrect: true,
      explanation: "問1の解説",
      sourceUrl: "https://www.fe-siken.com/kakomon/sample/q1.html",
    },
    {
      index: 2,
      questionUrl: "https://www.fe-siken.com/kakomon/sample/q2.html",
      questionText: "問2の本文",
      choices: [
        { label: "ア", text: "選択肢A" },
        { label: "イ", text: "選択肢B" },
      ],
      hasImages: false,
      selectedAnswer: "ア",
      correctAnswer: "イ",
      isCorrect: false,
      explanation: "問2の解説",
      sourceUrl: "https://www.fe-siken.com/kakomon/sample/q2.html",
    },
  ],
};

const desktopQuiz: SubmittedQuizResponseDto = {
  ...submittedQuiz,
  summary: {
    totalQuestions: 20,
    correctCount: 19,
    incorrectCount: 1,
    accuracy: 0.95,
  },
  questions: Array.from({ length: 20 }, (_, index) => ({
    index: index + 1,
    questionUrl: `https://www.fe-siken.com/kakomon/sample/q${index + 1}.html`,
    questionText: `問${index + 1}の本文`,
    choices: [{ label: "ア", text: "選択肢A" }],
    hasImages: false,
    selectedAnswer: index === 1 ? "ア" : "イ",
    correctAnswer: "ア",
    isCorrect: index !== 1,
    explanation: `問${index + 1}の解説`,
    sourceUrl: `https://www.fe-siken.com/kakomon/sample/q${index + 1}.html`,
  })),
};

describe("QuizResultView", () => {
  it("renders the mobile result summary, composition, and explanations in one column", () => {
    render(<QuizResultView quiz={submittedQuiz} />);

    const mobile = screen.getByTestId("mobile-result-view");
    expect(mobile).toHaveClass("lg:hidden");
    expect(within(mobile).getByText("正答率")).toBeInTheDocument();
    expect(within(mobile).getByText("50%")).toBeInTheDocument();
    expect(within(mobile).getByText("正解数 1")).toBeInTheDocument();
    expect(within(mobile).getByText("不正解数 1")).toBeInTheDocument();
    expect(within(mobile).getByText("出題構成")).toBeInTheDocument();
    expect(
      within(mobile).getByText("選択範囲 1問 / 復習・重点テーマ 1問")
    ).toBeInTheDocument();
    expect(within(mobile).getByText("問題 2")).toBeInTheDocument();
    expect(within(mobile).getByText("問2の本文")).toBeInTheDocument();
    expect(
      within(mobile).getByRole("button", { name: "イ 選択肢B" })
    ).toBeInTheDocument();
    expect(
      within(mobile).getAllByText("あなたの解答: ア").length
    ).toBeGreaterThan(0);
    expect(within(mobile).getByText("正解: イ")).toBeInTheDocument();
    expect(within(mobile).getByText("問2の解説")).toBeInTheDocument();
    expect(
      within(mobile).getByRole("link", {
        name: "https://www.fe-siken.com/kakomon/sample/q2.html",
      })
    ).toHaveAttribute(
      "href",
      "https://www.fe-siken.com/kakomon/sample/q2.html"
    );
    const question2 = within(mobile).getByTestId("explanation-detail-2");
    expect(
      within(question2).getByRole("button", {
        name: "\u30a2 \u9078\u629e\u80a2A",
      })
    ).toHaveAttribute("data-state", "incorrect");
    expect(
      within(question2).getByRole("button", {
        name: "\u30a4 \u9078\u629e\u80a2B",
      })
    ).toHaveAttribute("data-state", "correct");
  });

  it("renders desktop result with all question statuses and selected detail", () => {
    render(<QuizResultView quiz={desktopQuiz} />);

    const desktop = screen.getByTestId("desktop-result-view");
    expect(desktop).toHaveClass("hidden");
    expect(desktop).toHaveClass("lg:grid");
    expect(
      within(desktop).getAllByTestId("result-question-button")
    ).toHaveLength(20);
    expect(
      within(desktop).getByRole("button", { name: "問題 2 不正解" })
    ).toHaveAttribute("data-state", "incorrect");
    expect(within(desktop).getByText("問1の解説")).toBeInTheDocument();

    fireEvent.click(
      within(desktop).getByRole("button", { name: "問題 2 不正解" })
    );

    expect(within(desktop).getByText("問2の解説")).toBeInTheDocument();
    expect(within(desktop).getByText("問2の本文")).toBeInTheDocument();
    expect(within(desktop).getByText("あなたの解答: ア")).toBeInTheDocument();
  });
});
