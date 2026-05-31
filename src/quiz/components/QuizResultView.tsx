import type { SubmittedQuizResponseDto } from "../api-schemas";

type QuizResultViewProps = {
  quiz: SubmittedQuizResponseDto;
};

export function QuizResultView({ quiz }: QuizResultViewProps) {
  return (
    <section
      className="mx-auto max-w-5xl space-y-6"
      data-testid="quiz-result-view"
    >
      <h1 className="text-2xl font-semibold">{"\u7d50\u679c"}</h1>
      <div className="space-y-4 lg:hidden" data-testid="mobile-result-view">
        <section className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-600">{"\u6b63\u7b54\u7387"}</p>
          <p className="mt-3 text-4xl font-semibold">
            {Math.round(quiz.summary.accuracy * 100)}
            {"%"}
          </p>
          <div className="mt-4 flex gap-3 text-sm">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
              {"\u6b63\u89e3\u6570 "}
              {quiz.summary.correctCount}
            </span>
            <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">
              {"\u4e0d\u6b63\u89e3\u6570 "}
              {quiz.summary.incorrectCount}
            </span>
          </div>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">{"\u51fa\u984c\u69cb\u6210"}</h2>
          <p className="mt-2 text-sm text-slate-600">
            {"\u9078\u629e\u7bc4\u56f2 "}
            {quiz.selectionSummary.requestedScopeCount}
            {"\u554f / \u5fa9\u7fd2\u30fb\u91cd\u70b9\u30c6\u30fc\u30de "}
            {quiz.selectionSummary.reinforcementCount}
            {"\u554f"}
          </p>
        </section>
        <section className="space-y-3">
          {quiz.questions.map((question) => (
            <article
              className="rounded-lg border border-slate-200 bg-white p-5"
              key={question.index}
            >
              <h2 className="font-semibold">
                {"\u554f\u984c "}
                {question.index}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                {question.explanation}
              </p>
            </article>
          ))}
        </section>
      </div>
    </section>
  );
}
