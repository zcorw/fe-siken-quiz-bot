import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useQuestionCursor } from "./use-question-cursor";

describe("useQuestionCursor", () => {
  it("moves to next and previous questions within bounds", () => {
    const { result } = renderHook(() => useQuestionCursor(20));

    expect(result.current.currentQuestionIndex).toBe(1);

    act(() => {
      result.current.goNext();
    });
    expect(result.current.currentQuestionIndex).toBe(2);

    act(() => {
      result.current.goPrevious();
    });
    expect(result.current.currentQuestionIndex).toBe(1);

    act(() => {
      result.current.goPrevious();
    });
    expect(result.current.currentQuestionIndex).toBe(1);
  });

  it("jumps to a requested question and clamps invalid values", () => {
    const { result } = renderHook(() => useQuestionCursor(20));

    act(() => {
      result.current.goToQuestion(25);
    });
    expect(result.current.currentQuestionIndex).toBe(20);

    act(() => {
      result.current.goToQuestion(0);
    });
    expect(result.current.currentQuestionIndex).toBe(1);
  });
});
