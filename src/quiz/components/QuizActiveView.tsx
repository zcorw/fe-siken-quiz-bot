"use client";

import { useState } from "react";
import type { ActiveQuizResponseDto } from "../api-schemas";
import type { SubmitQuizRequestDto } from "../api-schemas";
import { useQuizAnswers } from "../client/use-quiz-answers";
import { useQuestionCursor } from "../client/use-question-cursor";
import { DesktopQuestionSidebar } from "./DesktopQuestionSidebar";
import { MobileQuestionSheet } from "./MobileQuestionSheet";
import { OptionButton } from "./OptionButton";
import { QuestionContent } from "./QuestionContent";
import { QuestionPager } from "./QuestionPager";
import { QuizProgressHeader } from "./QuizProgressHeader";
import { SubmitQuizButton } from "./SubmitQuizButton";

type QuizActiveViewProps = {
  quiz: ActiveQuizResponseDto;
  onSubmitAnswers?: (request: SubmitQuizRequestDto) => Promise<void>;
};

export function QuizActiveView({ onSubmitAnswers, quiz }: QuizActiveViewProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { answers, answeredCount, clearAnswers, selectAnswer } = useQuizAnswers(
    quiz.token
  );
  const { currentQuestionIndex, goNext, goPrevious, goToQuestion } =
    useQuestionCursor(quiz.totalQuestions);
  const currentQuestion =
    quiz.questions.find(
      (question) => question.index === currentQuestionIndex
    ) ??
    quiz.questions[0] ??
    null;
  const answeredQuestionIndexes = Object.keys(answers).map(Number);

  async function handleSubmit() {
    if (onSubmitAnswers === undefined) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmitAnswers({
        answers: quiz.questions.map((question) => ({
          questionIndex: question.index,
          selectedAnswer: answers[question.index] ?? "",
        })),
      });
      clearAnswers();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "\u63d0\u51fa\u306b\u5931\u6557\u3057\u307e\u3057\u305f"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl gap-8">
      <section className="min-w-0 flex-1 space-y-6">
        <h1 className="text-2xl font-semibold">
          {"\u79d1\u76eeA \u6f14\u7fd2"}
        </h1>
        <QuizProgressHeader
          answeredCount={answeredCount}
          currentQuestionIndex={currentQuestionIndex}
          totalQuestions={quiz.totalQuestions}
        />
        {submitError ? (
          <div
            aria-live="assertive"
            className="fixed inset-x-4 top-4 z-50 mx-auto max-w-3xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-lg"
            role="alert"
          >
            {submitError}
          </div>
        ) : null}
        <QuestionContent
          category={null}
          questionText={currentQuestion?.questionText ?? null}
        />
        <div className="space-y-3">
          {currentQuestion?.choices.map((choice) => (
            <OptionButton
              key={choice.label}
              label={choice.label}
              onSelect={(selectedAnswer) =>
                selectAnswer(currentQuestion.index, selectedAnswer)
              }
              selected={answers[currentQuestion.index] === choice.label}
              text={choice.text}
            />
          ))}
        </div>
        <div className="flex flex-col gap-4 lg:hidden">
          <MobileQuestionSheet
            answeredQuestionIndexes={answeredQuestionIndexes}
            currentQuestionIndex={currentQuestionIndex}
            onSelectQuestion={goToQuestion}
            totalQuestions={quiz.totalQuestions}
          />
        </div>
        <QuestionPager
          currentQuestionIndex={currentQuestionIndex}
          onNext={goNext}
          onPrevious={goPrevious}
          totalQuestions={quiz.totalQuestions}
        />
        <SubmitQuizButton
          answeredCount={answeredCount}
          onSubmit={handleSubmit}
          submitting={submitting}
          totalQuestions={quiz.totalQuestions}
        />
      </section>
      <DesktopQuestionSidebar
        answeredQuestionIndexes={answeredQuestionIndexes}
        currentQuestionIndex={currentQuestionIndex}
        onSelectQuestion={goToQuestion}
        totalQuestions={quiz.totalQuestions}
      />
    </div>
  );
}
