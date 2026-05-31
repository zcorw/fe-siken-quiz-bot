type QuestionNumberGridProps = {
  totalQuestions: number;
  currentQuestionIndex: number;
  answeredQuestionIndexes: number[];
  onSelectQuestion: (questionIndex: number) => void;
  testId?: string;
};

const stateClasses = {
  current: "bg-blue-600 text-white",
  answered: "bg-teal-50 text-teal-700",
  unanswered: "bg-white text-slate-700",
};

export function QuestionNumberGrid({
  totalQuestions,
  currentQuestionIndex,
  answeredQuestionIndexes,
  onSelectQuestion,
  testId = "question-grid",
}: QuestionNumberGridProps) {
  const answered = new Set(answeredQuestionIndexes);

  return (
    <div className="grid grid-cols-5 gap-3" data-testid={testId}>
      {Array.from({ length: totalQuestions }, (_, index) => {
        const questionIndex = index + 1;
        const state =
          questionIndex === currentQuestionIndex
            ? "current"
            : answered.has(questionIndex)
              ? "answered"
              : "unanswered";

        return (
          <button
            className={`h-12 rounded-lg border border-slate-200 text-sm font-semibold ${stateClasses[state]}`}
            data-state={state}
            data-testid="question-number-button"
            key={questionIndex}
            onClick={() => onSelectQuestion(questionIndex)}
            type="button"
          >
            {questionIndex}
          </button>
        );
      })}
    </div>
  );
}
