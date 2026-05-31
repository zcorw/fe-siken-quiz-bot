import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ActiveQuizResponseDto } from "../api-schemas";
import { QuizPageShell } from "./QuizPageShell";

const labels = {
  loading: "\u8aad\u307f\u8fbc\u307f\u4e2d",
  title: "\u79d1\u76eeA \u6f14\u7fd2",
  question: "\u554f\u984c 1",
  progress: "\u89e3\u7b54\u6e08\u307f 0 / 20",
  result: "\u7d50\u679c",
  accuracy: "\u6b63\u7b54\u7387 70%",
  expired:
    "\u3053\u306e\u30ea\u30f3\u30af\u306f\u671f\u9650\u5207\u308c\u3067\u3059",
  telegram:
    "Telegram\u3067\u65b0\u3057\u3044\u6f14\u7fd2\u3092\u4f5c\u6210\u3057\u3066\u304f\u3060\u3055\u3044",
};

const activeQuiz: ActiveQuizResponseDto = {
  status: "active",
  token: "quiz-token",
  totalQuestions: 20,
  questions: [
    {
      index: 1,
      questionUrl: "https://www.fe-siken.com/kakomon/29_haru/q8.html",
      questionText: "公開鍵暗号方式に関する問題です。",
      choices: [],
      hasImages: false,
    },
  ],
};

describe("QuizPageShell", () => {
  it("renders loading state", () => {
    render(<QuizPageShell state={{ status: "loading" }} />);

    expect(screen.getByText(labels.loading)).toBeInTheDocument();
  });

  it("renders active quiz state", () => {
    render(<QuizPageShell state={{ status: "active", quiz: activeQuiz }} />);

    expect(
      screen.getByRole("heading", { name: labels.title })
    ).toBeInTheDocument();
    expect(screen.getByText(labels.question)).toBeInTheDocument();
    expect(screen.getByText(labels.progress)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0"
    );
    expect(
      screen.getByText("公開鍵暗号方式に関する問題です。")
    ).toBeInTheDocument();
  });

  it("renders submitted quiz state", () => {
    render(
      <QuizPageShell
        state={{
          status: "submitted",
          quiz: {
            ...activeQuiz,
            status: "submitted",
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
          },
        }}
      />
    );

    expect(
      screen.getByRole("heading", { name: labels.result })
    ).toBeInTheDocument();
    expect(screen.getByText(labels.accuracy)).toBeInTheDocument();
  });

  it("renders error states with Telegram guidance", () => {
    render(
      <QuizPageShell state={{ status: "expired", message: labels.expired }} />
    );

    expect(screen.getByText(labels.expired)).toBeInTheDocument();
    expect(screen.getByText(labels.telegram)).toBeInTheDocument();
  });
});
