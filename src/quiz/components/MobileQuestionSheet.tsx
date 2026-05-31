"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { QuestionNumberGrid } from "./QuestionNumberGrid";

type MobileQuestionSheetProps = {
  totalQuestions: number;
  currentQuestionIndex: number;
  answeredQuestionIndexes: number[];
  onSelectQuestion: (questionIndex: number) => void;
};

export function MobileQuestionSheet({
  totalQuestions,
  currentQuestionIndex,
  answeredQuestionIndexes,
  onSelectQuestion,
}: MobileQuestionSheetProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          className="h-12 rounded-lg border border-slate-200 bg-white px-6 font-semibold text-slate-900"
          type="button"
        >
          {"\u554f\u984c\u4e00\u89a7"}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 rounded-t-2xl bg-white p-6 shadow-xl">
          <Dialog.Title className="text-xl font-semibold text-slate-900">
            {"\u554f\u984c\u4e00\u89a7"}
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            {"\u554f\u984c\u756a\u53f7\u3092\u9078\u629e\u3057\u307e\u3059"}
          </Dialog.Description>
          <div className="mt-6">
            <QuestionNumberGrid
              answeredQuestionIndexes={answeredQuestionIndexes}
              currentQuestionIndex={currentQuestionIndex}
              onSelectQuestion={onSelectQuestion}
              testId="mobile-question-grid"
              totalQuestions={totalQuestions}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
