"use client";

interface MarkdownViewerProps {
  content: string;
  imagesBaseUrl?: string;
}

export default function MarkdownViewer({
  content,
  imagesBaseUrl = "/images",
}: MarkdownViewerProps) {
  // Convert [IMAGE:filename.png] tags to <img> tags
  const rendered = content.replace(
    /\[IMAGE:([^\]]+)\]/g,
    (_, filename) =>
      `<img src="${imagesBaseUrl}/${filename}" alt="${filename}" class="max-w-full rounded-lg shadow my-4" loading="lazy" />`
  );

  // Basic Markdown rendering (headings, bold, lists, code blocks, hr)
  const html = rendered
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-gray-300 pl-4 text-gray-600 my-2">$1</blockquote>')
    .replace(/^---$/gm, '<hr class="my-6 border-gray-200" />')
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/\n\n/g, '<p class="mb-3"></p>');

  return (
    <div
      className="prose max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
