import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DesktopQuestionSidebar } from "./DesktopQuestionSidebar";

describe("DesktopQuestionSidebar", () => {
  it("renders a persistent question grid with status states", () => {
    const onSelectQuestion = vi.fn();
    render(
      <DesktopQuestionSidebar
        answeredQuestionIndexes={[1, 2]}
        currentQuestionIndex={3}
        onSelectQuestion={onSelectQuestion}
        totalQuestions={20}
      />
    );

    expect(screen.getByRole("complementary")).toBeInTheDocument();
    const grid = screen.getByTestId("desktop-question-grid");
    expect(grid).toHaveClass("grid-cols-5");
    expect(screen.getAllByTestId("question-number-button")).toHaveLength(20);
    expect(screen.getByRole("button", { name: "3" })).toHaveAttribute(
      "data-state",
      "current"
    );

    fireEvent.click(screen.getByRole("button", { name: "10" }));
    expect(onSelectQuestion).toHaveBeenCalledWith(10);
  });
});
