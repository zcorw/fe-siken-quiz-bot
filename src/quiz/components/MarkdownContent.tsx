"use client";

import { useState, type ComponentProps } from "react";
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
        }}
        rehypePlugins={[rehypeSanitize]}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
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
