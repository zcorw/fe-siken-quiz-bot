import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ActiveQuizResponseDto } from "../api-schemas";
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
});
