import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SubmitQuizButton } from "./SubmitQuizButton";

describe("SubmitQuizButton", () => {
  it("disables submit until all questions are answered", () => {
    const onSubmit = vi.fn();
    render(
      <SubmitQuizButton
        answeredCount={19}
        onSubmit={onSubmit}
        submitting={false}
        totalQuestions={20}
      />
    );

    expect(screen.getByRole("button", { name: "提出する" })).toBeDisabled();
    expect(
      screen.getByText("20問すべて解答すると提出できます")
    ).toBeInTheDocument();
  });

  it("submits after all questions are answered", () => {
    const onSubmit = vi.fn();
    render(
      <SubmitQuizButton
        answeredCount={20}
        onSubmit={onSubmit}
        submitting={false}
        totalQuestions={20}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "提出する" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
