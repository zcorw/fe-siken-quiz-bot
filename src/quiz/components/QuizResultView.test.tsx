import { render, screen, within } from "@testing-library/react";
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
      choices: [{ label: "イ", text: "選択肢B" }],
      hasImages: false,
      selectedAnswer: "ア",
      correctAnswer: "イ",
      isCorrect: false,
      explanation: "問2の解説",
      sourceUrl: "https://www.fe-siken.com/kakomon/sample/q2.html",
    },
  ],
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
    expect(within(mobile).getByText("問2の解説")).toBeInTheDocument();
  });
});
