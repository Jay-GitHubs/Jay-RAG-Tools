"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ComponentPropsWithoutRef } from "react";

interface MarkdownViewerProps {
  content: string;
  imagesBaseUrl?: string;
}

export default function MarkdownViewer({
  content,
  imagesBaseUrl = "/images",
}: MarkdownViewerProps) {
  // Convert [IMAGE:doc_stem/file.png] tags to standard markdown images
  const preprocessed = content.replace(
    /\[IMAGE:([^\]]+)\]/g,
    (_, path: string) => {
      const filename = path.split("/").pop() ?? path;
      return `![${filename}](${imagesBaseUrl}/${path})`;
    }
  );

  return (
    <div className="prose prose-slate max-w-none prose-headings:text-indigo-950 prose-a:text-indigo-600 prose-strong:text-slate-800 prose-code:text-indigo-700 prose-code:bg-indigo-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        children={preprocessed}
        components={{
          img: ({ src, alt, ...props }: ComponentPropsWithoutRef<"img">) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt ?? ""}
              loading="lazy"
              className="rounded-lg shadow my-4 max-w-full"
              {...props}
            />
          ),
          a: ({ href, children, ...props }: ComponentPropsWithoutRef<"a">) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
        }}
      />
    </div>
  );
}
