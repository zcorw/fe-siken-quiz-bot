"use client";

import { useMemo, useState } from "react";
import {
  clearStoredAnswers,
  loadStoredAnswers,
  saveStoredAnswer,
  type StoredAnswers,
} from "./answer-storage";

export function useQuizAnswers(token: string) {
  const [answers, setAnswers] = useState<StoredAnswers>(() =>
    loadStoredAnswers(token)
  );

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  function selectAnswer(questionIndex: number, selectedAnswer: string) {
    saveStoredAnswer(token, questionIndex, selectedAnswer);
    setAnswers(loadStoredAnswers(token));
  }

  function clearAnswers() {
    clearStoredAnswers(token);
    setAnswers({});
  }

  return {
    answers,
    answeredCount,
    selectAnswer,
    clearAnswers,
  };
}
