"use client";

import { useState } from "react";

export function useQuestionCursor(totalQuestions: number) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(1);

  function goToQuestion(questionIndex: number) {
    setCurrentQuestionIndex(clampQuestionIndex(questionIndex, totalQuestions));
  }

  function goNext() {
    setCurrentQuestionIndex((current) =>
      clampQuestionIndex(current + 1, totalQuestions)
    );
  }

  function goPrevious() {
    setCurrentQuestionIndex((current) =>
      clampQuestionIndex(current - 1, totalQuestions)
    );
  }

  return {
    currentQuestionIndex,
    goToQuestion,
    goNext,
    goPrevious,
  };
}

function clampQuestionIndex(questionIndex: number, totalQuestions: number) {
  return Math.min(Math.max(questionIndex, 1), Math.max(totalQuestions, 1));
}
