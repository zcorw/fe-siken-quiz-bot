import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActiveQuizResponseDto } from "../api-schemas";
import { QuizActiveView } from "./QuizActiveView";

const quiz: ActiveQuizResponseDto = {
  status: "active",
  token: "quiz-token",
  totalQuestions: 2,
  questions: [
    {
      index: 1,
      questionUrl: "https://www.fe-siken.com/kakomon/sample/q1.html",
      questionText: "問1の本文",
      choices: [
        { label: "ア", text: "選択肢A" },
        { label: "イ", text: "選択肢B" },
      ],
      hasImages: false,
    },
    {
      index: 2,
      questionUrl: "https://www.fe-siken.com/kakomon/sample/q2.html",
      questionText: "問2の本文",
      choices: [{ label: "ア", text: "選択肢A" }],
      hasImages: false,
    },
  ],
};

describe("QuizActiveView", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("selects an answer, updates progress, and moves to the next question", () => {
    render(<QuizActiveView quiz={quiz} />);

    expect(screen.getByText("問1の本文")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ア 選択肢A" }));

    expect(screen.getByRole("button", { name: "ア 選択肢A" })).toHaveAttribute(
      "data-state",
      "selected"
    );
    expect(screen.getByText("解答済み 1 / 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "次へ" }));

    expect(screen.getByText("問2の本文")).toBeInTheDocument();
    expect(screen.getByText("問題 2")).toBeInTheDocument();
  });

  it("submits all selected answers after every question is answered", async () => {
    const onSubmitAnswers = vi.fn().mockResolvedValue(undefined);
    render(<QuizActiveView onSubmitAnswers={onSubmitAnswers} quiz={quiz} />);

    fireEvent.click(screen.getByRole("button", { name: "ア 選択肢A" }));
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    fireEvent.click(screen.getByRole("button", { name: "ア 選択肢A" }));
    fireEvent.click(screen.getByRole("button", { name: "提出する" }));

    await waitFor(() => {
      expect(onSubmitAnswers).toHaveBeenCalledWith({
        answers: [
          { questionIndex: 1, selectedAnswer: "ア" },
          { questionIndex: 2, selectedAnswer: "ア" },
        ],
      });
    });
  });
});
