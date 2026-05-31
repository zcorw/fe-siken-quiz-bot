"use client";

import { useEffect, useState } from "react";
import {
  fetchQuiz,
  QuizApiClientError,
  type QuizResponseDto,
} from "../client/api";
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
};

export function QuizPageClient({
  token,
  loadQuiz = fetchQuiz,
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

  return <QuizPageShell state={state} />;
}
