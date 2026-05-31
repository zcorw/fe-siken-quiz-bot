import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MobileQuestionSheet } from "./MobileQuestionSheet";

describe("MobileQuestionSheet", () => {
  it("opens a bottom sheet with a 5-column 20-question grid", () => {
    const onSelectQuestion = vi.fn();
    render(
      <MobileQuestionSheet
        answeredQuestionIndexes={[1, 2]}
        currentQuestionIndex={3}
        onSelectQuestion={onSelectQuestion}
        totalQuestions={20}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "問題一覧" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const grid = screen.getByTestId("mobile-question-grid");
    expect(grid).toHaveClass("grid-cols-5");
    expect(screen.getAllByTestId("question-number-button")).toHaveLength(20);
    expect(screen.getByRole("button", { name: "3" })).toHaveAttribute(
      "data-state",
      "current"
    );
    expect(screen.getByRole("button", { name: "2" })).toHaveAttribute(
      "data-state",
      "answered"
    );
    expect(screen.getByRole("button", { name: "4" })).toHaveAttribute(
      "data-state",
      "unanswered"
    );

    fireEvent.click(screen.getByRole("button", { name: "4" }));
    expect(onSelectQuestion).toHaveBeenCalledWith(4);
  });
});
