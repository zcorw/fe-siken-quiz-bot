import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuizProgressHeader } from "./QuizProgressHeader";

describe("QuizProgressHeader", () => {
  it("renders question text above the progress bar", () => {
    render(
      <QuizProgressHeader
        currentQuestionIndex={3}
        answeredCount={12}
        totalQuestions={20}
      />
    );

    const questionText = screen.getByText("\u554f\u984c 3");
    const answeredText = screen.getByText("\u89e3\u7b54\u6e08\u307f 12 / 20");
    const progressBar = screen.getByRole("progressbar");

    expect(questionText).toBeInTheDocument();
    expect(answeredText).toBeInTheDocument();
    expect(progressBar).toHaveAttribute("aria-valuenow", "12");
    expect(progressBar).toHaveAttribute("aria-valuemax", "20");
    expect(
      questionText.compareDocumentPosition(progressBar) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});
