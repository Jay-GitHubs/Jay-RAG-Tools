export interface MarkdownSection {
  /** 0 = document header (before first ## Page), 1+ = page sections */
  pageNumber: number;
  /** The "## Page N" header line, empty for header section */
  header: string;
  /** Full section content including header and trailing separator */
  content: string;
  /** Content without the header line (for display in cards) */
  rawContent: string;
}

const PAGE_HEADER_RE = /^## Page (\d+)/;

/**
 * Parse enriched markdown into page-based sections.
 * Splits on `## Page N` headers produced by the processor.
 */
export function parseMarkdownSections(markdown: string): MarkdownSection[] {
  const lines = markdown.split("\n");
  const sections: MarkdownSection[] = [];
  let currentLines: string[] = [];
  let currentPage = 0;
  let currentHeader = "";

  function flush() {
    if (currentLines.length === 0 && currentPage === 0) return;

    const content = currentLines.join("\n");
    const rawContent = currentHeader
      ? currentLines
          .slice(1) // skip the header line
          .join("\n")
          .replace(/^---\s*\n?/, "") // strip leading separator
          .trim()
      : content.trim();

    sections.push({
      pageNumber: currentPage,
      header: currentHeader,
      content,
      rawContent,
    });
  }

  for (const line of lines) {
    const match = line.match(PAGE_HEADER_RE);
    if (match) {
      flush();
      currentPage = parseInt(match[1], 10);
      currentHeader = line;
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }

  flush();
  return sections;
}

/**
 * Reassemble sections back into a single markdown string.
 * Sections are joined with `---` separators between page sections.
 */
export function reassembleMarkdown(sections: MarkdownSection[]): string {
  const parts: string[] = [];

  for (const section of sections) {
    if (section.pageNumber === 0) {
      // Header section — include as-is
      parts.push(section.content);
    } else {
      // Page section — ensure it has its header and separator
      parts.push(section.content);
    }
  }

  return parts.join("\n");
}
