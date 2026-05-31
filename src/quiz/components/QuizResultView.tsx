import type { SubmittedQuizResponseDto } from "../api-schemas";

type QuizResultViewProps = {
  quiz: SubmittedQuizResponseDto;
};

export function QuizResultView({ quiz }: QuizResultViewProps) {
  return (
    <section className="mx-auto max-w-5xl" data-testid="quiz-result-view">
      <h1 className="text-2xl font-semibold">{"\u7d50\u679c"}</h1>
      <p className="mt-4 text-lg font-semibold">
        {"\u6b63\u7b54\u7387 "}
        {Math.round(quiz.summary.accuracy * 100)}
        {"%"}
      </p>
    </section>
  );
}
