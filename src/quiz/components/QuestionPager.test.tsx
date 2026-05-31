import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuestionPager } from "./QuestionPager";

describe("QuestionPager", () => {
  it("disables previous on the first question and calls next", () => {
    const onNext = vi.fn();
    render(
      <QuestionPager
        currentQuestionIndex={1}
        onNext={onNext}
        onPrevious={() => undefined}
        totalQuestions={20}
      />
    );

    expect(screen.getByRole("button", { name: "前へ" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("disables next on the last question and calls previous", () => {
    const onPrevious = vi.fn();
    render(
      <QuestionPager
        currentQuestionIndex={20}
        onNext={() => undefined}
        onPrevious={onPrevious}
        totalQuestions={20}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "前へ" }));
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "次へ" })).toBeDisabled();
  });
});
