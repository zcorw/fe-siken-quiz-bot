"use client";

import { useEffect, useState } from "react";
import {
  fetchQuiz,
  QuizApiClientError,
  submitQuiz,
  type QuizResponseDto,
} from "../client/api";
import type {
  SubmitQuizRequestDto,
  SubmittedQuizResponseDto,
} from "../api-schemas";
import {
  createQuizPageErrorState,
  createQuizPageReadyState,
  initialQuizPageState,
  type QuizPageState,
} from "../client/page-state";
import { QuizPageShell } from "./QuizPageShell";

type QuizPageClientProps = {
  token: string;
  loadQuiz?: (token: string) => Promise<QuizResponseDto>;
  submitAnswers?: (
    token: string,
    request: SubmitQuizRequestDto
  ) => Promise<SubmittedQuizResponseDto>;
};

export function QuizPageClient({
  token,
  loadQuiz = fetchQuiz,
  submitAnswers = submitQuiz,
}: QuizPageClientProps) {
  const [state, setState] = useState<QuizPageState>(initialQuizPageState);

  useEffect(() => {
    let mounted = true;

    loadQuiz(token)
      .then((quiz) => {
        if (mounted) {
          setState(createQuizPageReadyState(quiz));
        }
      })
      .catch((error: unknown) => {
        if (!mounted) {
          return;
        }

        if (error instanceof QuizApiClientError) {
          setState(createQuizPageErrorState(error.response));
          return;
        }

        setState({
          status: "error",
          message:
            "\u8aad\u307f\u8fbc\u307f\u306b\u5931\u6557\u3057\u307e\u3057\u305f",
        });
      });

    return () => {
      mounted = false;
    };
  }, [loadQuiz, token]);

  async function handleSubmitAnswers(request: SubmitQuizRequestDto) {
    const submittedQuiz = await submitAnswers(token, request);
    setState(createQuizPageReadyState(submittedQuiz));
  }

  return <QuizPageShell onSubmitAnswers={handleSubmitAnswers} state={state} />;
}
