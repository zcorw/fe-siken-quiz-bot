"use client";

type QuestionPagerProps = {
  currentQuestionIndex: number;
  totalQuestions: number;
  onPrevious: () => void;
  onNext: () => void;
};

const buttonClass =
  "h-12 rounded-lg border border-slate-200 bg-white px-8 font-semibold text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

export function QuestionPager({
  currentQuestionIndex,
  totalQuestions,
  onPrevious,
  onNext,
}: QuestionPagerProps) {
  return (
    <nav className="flex items-center justify-between gap-4">
      <button
        className={buttonClass}
        disabled={currentQuestionIndex <= 1}
        onClick={onPrevious}
        type="button"
      >
        {"\u524d\u3078"}
      </button>
      <button
        className="h-12 rounded-lg bg-teal-600 px-8 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        disabled={currentQuestionIndex >= totalQuestions}
        onClick={onNext}
        type="button"
      >
        {"\u6b21\u3078"}
      </button>
    </nav>
  );
}
