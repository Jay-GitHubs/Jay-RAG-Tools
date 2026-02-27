"use client";

import { Children, isValidElement, cloneElement, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

interface MarkdownViewerProps {
  content: string;
  imagesBaseUrl?: string;
  highlightQuery?: string;
  highlightCaseSensitive?: boolean;
}

function highlightText(text: string, query: string, caseSensitive: boolean): ReactNode {
  if (!query) return text;
  try {
    const flags = caseSensitive ? "g" : "gi";
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, flags);
    const parts = text.split(regex);
    if (parts.length <= 1) return text;
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 rounded-sm px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  } catch {
    return text;
  }
}

/** Recursively walk React children, highlighting any string text nodes. */
function highlightChildren(
  children: ReactNode,
  query: string,
  caseSensitive: boolean
): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === "string") {
      return highlightText(child, query, caseSensitive);
    }
    if (isValidElement<{ children?: ReactNode }>(child) && child.props.children) {
      return cloneElement(
        child,
        {},
        highlightChildren(child.props.children, query, caseSensitive)
      );
    }
    return child;
  });
}

export default function MarkdownViewer({
  content,
  imagesBaseUrl = "/images",
  highlightQuery,
  highlightCaseSensitive = false,
}: MarkdownViewerProps) {
  // Convert [IMAGE:doc_stem/file.png] tags to standard markdown images
  const preprocessed = content.replace(
    /\[IMAGE:([^\]]+)\]/g,
    (_, path: string) => {
      const filename = path.split("/").pop() ?? path;
      return `![${filename}](${imagesBaseUrl}/${path})`;
    }
  );

  const components = useMemo(() => {
    const imgComponent = ({
      src,
      alt,
      ...props
    }: ComponentPropsWithoutRef<"img">) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt ?? ""}
        loading="lazy"
        className="rounded-lg shadow my-4 max-w-full"
        {...props}
      />
    );

    const aComponent = ({
      href,
      children,
      ...props
    }: ComponentPropsWithoutRef<"a">) => (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );

    if (!highlightQuery) {
      return { img: imgComponent, a: aComponent };
    }

    // When highlighting, wrap text-containing elements to highlight matches
    const wrap =
      (Tag: "p" | "li" | "td" | "th" | "strong" | "em") =>
      ({ children, ...props }: ComponentPropsWithoutRef<typeof Tag>) => {
        const El = Tag;
        return (
          <El {...(props as Record<string, unknown>)}>
            {highlightChildren(children, highlightQuery, highlightCaseSensitive)}
          </El>
        );
      };

    return {
      img: imgComponent,
      a: aComponent,
      p: wrap("p"),
      li: wrap("li"),
      td: wrap("td"),
      th: wrap("th"),
      strong: wrap("strong"),
      em: wrap("em"),
    };
  }, [highlightQuery, highlightCaseSensitive]);

  return (
    <div className="prose prose-slate max-w-none prose-headings:text-indigo-950 prose-a:text-indigo-600 prose-strong:text-slate-800 prose-code:text-indigo-700 prose-code:bg-indigo-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        children={preprocessed}
        components={components}
      />
    </div>
  );
}
