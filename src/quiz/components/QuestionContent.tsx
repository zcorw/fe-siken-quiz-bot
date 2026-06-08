"use client";

import { MarkdownContent } from "./MarkdownContent";

type QuestionContentProps = {
  category: string | null;
  questionText: string | null;
  sourceUrl?: string | null;
};

const fallbackText =
  "\u554f\u984c\u6587\u3092\u8aad\u307f\u8fbc\u3081\u307e\u305b\u3093\u3067\u3057\u305f";

export function QuestionContent({
  category,
  questionText,
  sourceUrl,
}: QuestionContentProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      {category ? (
        <p className="mb-4 inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
          {category}
        </p>
      ) : null}
      {questionText ? (
        <MarkdownContent
          className="prose prose-slate max-w-none text-base leading-7"
          markdown={questionText}
        />
      ) : (
        <p className="text-slate-600">{fallbackText}</p>
      )}
      {sourceUrl ? (
        <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-500">
          <a
            className="break-all text-blue-600 underline-offset-2 hover:underline"
            href={sourceUrl}
            rel="noreferrer"
            target="_blank"
          >
            {"\u51fa\u5178"}: {sourceUrl}
          </a>
        </p>
      ) : null}
    </article>
  );
}
