type QuizProgressHeaderProps = {
  currentQuestionIndex: number;
  answeredCount: number;
  totalQuestions: number;
};

export function QuizProgressHeader({
  currentQuestionIndex,
  answeredCount,
  totalQuestions,
}: QuizProgressHeaderProps) {
  const progressPercent =
    totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  return (
    <header className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900">
          {"\u554f\u984c "}
          {currentQuestionIndex}
        </h1>
        <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-700">
          {"\u89e3\u7b54\u6e08\u307f "}
          {answeredCount}
          {" / "}
          {totalQuestions}
        </span>
      </div>
      <div
        aria-valuemax={totalQuestions}
        aria-valuemin={0}
        aria-valuenow={answeredCount}
        className="h-2 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-teal-600"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </header>
  );
}
