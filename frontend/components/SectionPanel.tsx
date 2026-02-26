"use client";

import { useCallback, useEffect, useRef } from "react";
import MarkdownViewer from "./MarkdownViewer";
import type { MarkdownSection } from "@/lib/markdownSections";
import type { TrashDetection } from "@/lib/types";

interface SectionPanelProps {
  sections: MarkdownSection[];
  trash: TrashDetection[];
  activePage: number;
  onPageChange: (page: number) => void;
  onDeleteSection: (pageNumber: number) => void;
  syncSource: React.RefObject<string | null>;
}

const TRASH_LABELS: Record<string, string> = {
  table_of_contents: "TOC",
  boilerplate: "Boilerplate",
  blank_page: "Blank",
  header_footer: "Header/Footer",
};

export default function SectionPanel({
  sections,
  trash,
  activePage,
  onPageChange,
  onDeleteSection,
  syncSource,
}: SectionPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Build trash lookup: page → trash type
  const trashByPage = new Map<number, string>();
  for (const t of trash) {
    trashByPage.set(t.page, TRASH_LABELS[t.trash_type] || t.trash_type);
  }

  // IntersectionObserver to detect which section is visible
  useEffect(() => {
    const container = containerRef.current;
    if (!container || sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (syncSource.current === "left") return;

        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
            const pageNum = Number(entry.target.getAttribute("data-section"));
            if (!isNaN(pageNum) && pageNum !== activePage) {
              syncSource.current = "right";
              onPageChange(pageNum);
              setTimeout(() => {
                if (syncSource.current === "right") syncSource.current = null;
              }, 100);
            }
          }
        }
      },
      {
        root: container,
        threshold: [0.3],
      }
    );

    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections, activePage, onPageChange, syncSource]);

  // Scroll to section when PDF navigates
  useEffect(() => {
    if (syncSource.current !== "left") return;
    const el = sectionRefs.current.get(activePage);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activePage, syncSource]);

  const setSectionRef = useCallback(
    (page: number) => (el: HTMLDivElement | null) => {
      if (el) {
        sectionRefs.current.set(page, el);
      } else {
        sectionRefs.current.delete(page);
      }
    },
    []
  );

  return (
    <div ref={containerRef} className="h-full overflow-y-auto p-4 space-y-4">
      {sections.map((section) => {
        const isActive = section.pageNumber === activePage;
        const trashLabel = trashByPage.get(section.pageNumber);
        const isHeader = section.pageNumber === 0;

        return (
          <div
            key={section.pageNumber}
            ref={setSectionRef(section.pageNumber)}
            data-section={section.pageNumber}
            className={`rounded-lg border bg-white p-4 transition-all ${
              isActive
                ? "ring-2 ring-indigo-500 border-indigo-300"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            {/* Card header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {isHeader ? "Header" : `Page ${section.pageNumber}`}
                </span>
                {trashLabel && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-700">
                    {trashLabel}
                  </span>
                )}
              </div>
              {!isHeader && (
                <button
                  onClick={() => {
                    if (
                      confirm(
                        `Remove Page ${section.pageNumber} section from the markdown?`
                      )
                    ) {
                      onDeleteSection(section.pageNumber);
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  title={`Delete page ${section.pageNumber}`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Card body — rendered markdown */}
            <div className="max-h-[300px] overflow-y-auto">
              {section.rawContent ? (
                <MarkdownViewer content={section.rawContent} />
              ) : (
                <p className="text-xs text-slate-400 italic">Empty section</p>
              )}
            </div>
          </div>
        );
      })}

      {sections.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          No sections found in markdown.
        </div>
      )}
    </div>
  );
}
