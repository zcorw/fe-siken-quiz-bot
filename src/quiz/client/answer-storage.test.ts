import { beforeEach, describe, expect, it } from "vitest";
import {
  clearStoredAnswers,
  loadStoredAnswers,
  saveStoredAnswer,
} from "./answer-storage";

describe("answer storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves and loads answers scoped by token", () => {
    saveStoredAnswer("token-a", 1, "\u30a2");
    saveStoredAnswer("token-a", 2, "\u30a4");
    saveStoredAnswer("token-b", 1, "\u30a6");

    expect(loadStoredAnswers("token-a")).toEqual({
      1: "\u30a2",
      2: "\u30a4",
    });
    expect(loadStoredAnswers("token-b")).toEqual({
      1: "\u30a6",
    });
  });

  it("clears answers after successful submit", () => {
    saveStoredAnswer("token-a", 1, "\u30a2");

    clearStoredAnswers("token-a");

    expect(loadStoredAnswers("token-a")).toEqual({});
  });

  it("returns empty answers for malformed storage data", () => {
    localStorage.setItem("quiz.answers.token-a", "{bad json");

    expect(loadStoredAnswers("token-a")).toEqual({});
  });
});
