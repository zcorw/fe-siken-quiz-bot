"use client";

type SubmitQuizButtonProps = {
  answeredCount: number;
  totalQuestions: number;
  submitting: boolean;
  onSubmit: () => void;
};

const hintText =
  "\u0032\u0030\u554f\u3059\u3079\u3066\u89e3\u7b54\u3059\u308b\u3068\u63d0\u51fa\u3067\u304d\u307e\u3059";

export function SubmitQuizButton({
  answeredCount,
  totalQuestions,
  submitting,
  onSubmit,
}: SubmitQuizButtonProps) {
  const readyToSubmit = answeredCount >= totalQuestions;
  const disabled = !readyToSubmit || submitting;

  return (
    <div className="space-y-2">
      <button
        className="h-12 w-full rounded-lg bg-teal-600 px-6 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        disabled={disabled}
        onClick={onSubmit}
        type="button"
      >
        {"\u63d0\u51fa\u3059\u308b"}
      </button>
      {!readyToSubmit ? (
        <p className="text-center text-sm text-slate-500">{hintText}</p>
      ) : null}
    </div>
  );
}
