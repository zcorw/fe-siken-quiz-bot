"use client";

type OptionButtonResultState = "correct" | "incorrect";

type OptionButtonProps = {
  label: string;
  text: string;
  selected: boolean;
  onSelect: (label: string) => void;
  resultState?: OptionButtonResultState;
};

const stateClasses = {
  idle: "border-slate-200 bg-white text-slate-900 hover:border-teal-500",
  selected: "border-teal-600 bg-teal-50 text-slate-900",
  correct: "border-emerald-500 bg-emerald-50 text-slate-900",
  incorrect: "border-red-500 bg-red-50 text-slate-900",
};

export function OptionButton({
  label,
  text,
  selected,
  onSelect,
  resultState,
}: OptionButtonProps) {
  const state = resultState ?? (selected ? "selected" : "idle");

  return (
    <button
      aria-label={`${label} ${text}`}
      aria-pressed={selected}
      className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors ${stateClasses[state]}`}
      data-state={state}
      disabled={Boolean(resultState)}
      onClick={() => onSelect(label)}
      type="button"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current text-sm font-semibold">
        {label}
      </span>
      <span className="pt-1 leading-6">{text}</span>
    </button>
  );
}
