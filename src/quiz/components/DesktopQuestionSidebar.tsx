"use client";

import { QuestionNumberGrid } from "./QuestionNumberGrid";

type DesktopQuestionSidebarProps = {
  totalQuestions: number;
  currentQuestionIndex: number;
  answeredQuestionIndexes: number[];
  onSelectQuestion: (questionIndex: number) => void;
};

export function DesktopQuestionSidebar({
  totalQuestions,
  currentQuestionIndex,
  answeredQuestionIndexes,
  onSelectQuestion,
}: DesktopQuestionSidebarProps) {
  return (
    <aside
      aria-label="\u554f\u984c\u4e00\u89a7"
      className="hidden w-80 shrink-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:block"
    >
      <h2 className="mb-5 text-lg font-semibold text-slate-900">
        {"\u554f\u984c\u4e00\u89a7"}
      </h2>
      <QuestionNumberGrid
        answeredQuestionIndexes={answeredQuestionIndexes}
        currentQuestionIndex={currentQuestionIndex}
        onSelectQuestion={onSelectQuestion}
        testId="desktop-question-grid"
        totalQuestions={totalQuestions}
      />
    </aside>
  );
}
