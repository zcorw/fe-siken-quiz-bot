import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { saveStoredAnswer } from "./answer-storage";
import { useQuizAnswers } from "./use-quiz-answers";

describe("useQuizAnswers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads existing token answers from localStorage", () => {
    saveStoredAnswer("token-a", 1, "\u30a2");

    const { result } = renderHook(() => useQuizAnswers("token-a"));

    expect(result.current.answers).toEqual({ 1: "\u30a2" });
    expect(result.current.answeredCount).toBe(1);
  });

  it("updates state and localStorage when selecting an answer", () => {
    const { result } = renderHook(() => useQuizAnswers("token-a"));

    act(() => {
      result.current.selectAnswer(2, "\u30a4");
    });

    expect(result.current.answers).toEqual({ 2: "\u30a4" });
    expect(
      JSON.parse(localStorage.getItem("quiz.answers.token-a") ?? "{}")
    ).toEqual({
      2: "\u30a4",
    });
  });

  it("clears state and storage after successful submit", () => {
    saveStoredAnswer("token-a", 1, "\u30a2");
    const { result } = renderHook(() => useQuizAnswers("token-a"));

    act(() => {
      result.current.clearAnswers();
    });

    expect(result.current.answers).toEqual({});
    expect(localStorage.getItem("quiz.answers.token-a")).toBeNull();
  });
});
