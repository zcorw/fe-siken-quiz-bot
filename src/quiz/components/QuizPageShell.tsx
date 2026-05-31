import type { QuizPageState } from "../client/page-state";

const text = {
  title: "\u79d1\u76eeA \u6f14\u7fd2",
  loading: "\u8aad\u307f\u8fbc\u307f\u4e2d",
  result: "\u7d50\u679c",
  telegram:
    "Telegram\u3067\u65b0\u3057\u3044\u6f14\u7fd2\u3092\u4f5c\u6210\u3057\u3066\u304f\u3060\u3055\u3044",
};

type QuizPageShellProps = {
  state: QuizPageState;
};

export function QuizPageShell({ state }: QuizPageShellProps) {
  if (state.status === "loading") {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
        <p>{text.loading}</p>
      </main>
    );
  }

  if (
    state.status === "not_found" ||
    state.status === "expired" ||
    state.status === "error"
  ) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
        <section
          aria-live="polite"
          className="mx-auto max-w-lg rounded-lg bg-white p-6"
        >
          <h1 className="text-xl font-semibold">{state.message}</h1>
          <p className="mt-3 text-sm text-slate-600">{text.telegram}</p>
        </section>
      </main>
    );
  }

  if (state.status === "submitted") {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
        <section className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-semibold">{text.result}</h1>
          <p className="mt-4 text-lg font-semibold">
            {"\u6b63\u7b54\u7387 "}
            {Math.round(state.quiz.summary.accuracy * 100)}
            {"%"}
          </p>
        </section>
      </main>
    );
  }

  if (state.status === "active") {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
        <section className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-semibold">{text.title}</h1>
          <p className="mt-4">
            {"\u554f\u984c 1 / "}
            {state.quiz.totalQuestions}
          </p>
        </section>
      </main>
    );
  }

  return null;
}
