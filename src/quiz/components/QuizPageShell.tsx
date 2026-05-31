import type { SubmitQuizRequestDto } from "../api-schemas";
import type { QuizPageState } from "../client/page-state";
import { QuizActiveView } from "./QuizActiveView";
import { QuizResultView } from "./QuizResultView";

const text = {
  loading: "\u8aad\u307f\u8fbc\u307f\u4e2d",
  telegram:
    "Telegram\u3067\u65b0\u3057\u3044\u6f14\u7fd2\u3092\u4f5c\u6210\u3057\u3066\u304f\u3060\u3055\u3044",
};

type QuizPageShellProps = {
  onSubmitAnswers?: (request: SubmitQuizRequestDto) => Promise<void>;
  state: QuizPageState;
};

export function QuizPageShell({ onSubmitAnswers, state }: QuizPageShellProps) {
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
          <a
            className="mt-5 inline-flex h-11 items-center rounded-lg bg-teal-600 px-5 font-semibold text-white"
            href="https://t.me/"
          >
            {"Telegram\u3078\u623b\u308b"}
          </a>
        </section>
      </main>
    );
  }

  if (state.status === "submitted") {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
        <QuizResultView quiz={state.quiz} />
      </main>
    );
  }

  if (state.status === "active") {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
        <QuizActiveView onSubmitAnswers={onSubmitAnswers} quiz={state.quiz} />
      </main>
    );
  }

  return null;
}
