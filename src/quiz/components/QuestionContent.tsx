import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

type QuestionContentProps = {
  category: string | null;
  questionText: string | null;
};

const fallbackText =
  "\u554f\u984c\u6587\u3092\u8aad\u307f\u8fbc\u3081\u307e\u305b\u3093\u3067\u3057\u305f";

export function QuestionContent({
  category,
  questionText,
}: QuestionContentProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      {category ? (
        <p className="mb-4 inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
          {category}
        </p>
      ) : null}
      {questionText ? (
        <div className="prose prose-slate max-w-none text-base leading-7">
          <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
            {questionText}
          </ReactMarkdown>
        </div>
      ) : (
        <p className="text-slate-600">{fallbackText}</p>
      )}
    </article>
  );
}
