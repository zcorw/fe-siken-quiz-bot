"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

type MarkdownContentProps = {
  className?: string;
  markdown: string;
};

export function MarkdownContent({ className, markdown }: MarkdownContentProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          img: MarkdownImage,
          p: MarkdownParagraph,
        }}
        rehypePlugins={[rehypeSanitize]}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

function MarkdownParagraph({
  children,
  ...props
}: ComponentProps<"p">) {
  const text = getSingleTextChild(children);

  if (text === null || !text.includes("\n")) {
    return <p {...props}>{children}</p>;
  }

  return (
    <p {...props}>
      {text.split("\n").map((line, index) => (
        <QuestionTextLine key={`${index}:${line}`} line={line} />
      ))}
    </p>
  );
}

function QuestionTextLine({ line }: { line: string }) {
  const blank = parseStandaloneBlank(line);
  if (blank !== null) {
    return (
      <span className="block">
        <span
          aria-label={`blank ${blank}`}
          className="inline-flex min-w-16 justify-center border-2 border-slate-500 px-5 py-1 font-semibold leading-none"
        >
          {blank}
        </span>
      </span>
    );
  }

  const { indent, text } = splitIndent(line);
  return (
    <span
      className="block"
      style={indent > 0 ? { marginInlineStart: `${indent}em` } : undefined}
    >
      {text || "\u00a0"}
    </span>
  );
}

function getSingleTextChild(children: ReactNode): string | null {
  if (typeof children === "string") {
    return children;
  }

  if (
    Array.isArray(children) &&
    children.length === 1 &&
    typeof children[0] === "string"
  ) {
    return children[0];
  }

  return null;
}

function parseStandaloneBlank(line: string): string | null {
  const match = /^[\s\u3000]*([A-Za-z])[\s\u3000]*$/.exec(line);
  return match?.[1] ?? null;
}

function splitIndent(line: string): { indent: number; text: string } {
  const match = /^([\s\u3000]*)(.*)$/.exec(line);
  const indentText = match?.[1] ?? "";
  const text = match?.[2] ?? line;
  const indent = Array.from(indentText).reduce(
    (total, char) => total + (char === "\u3000" ? 1 : 0.5),
    0
  );

  return { indent, text };
}

function MarkdownImage({
  alt = "",
  src = "",
  ...props
}: ComponentProps<"img">) {
  const [failed, setFailed] = useState(false);
  const filename = typeof src === "string" ? src.split("/").pop() : null;

  if (failed) {
    return (
      <span
        aria-label={alt}
        className="block rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600"
        role="img"
      >
        <span className="block font-medium text-slate-700">{alt}</span>
        {filename ? <span className="block">{filename}</span> : null}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} onError={() => setFailed(true)} src={src} {...props} />
  );
}
