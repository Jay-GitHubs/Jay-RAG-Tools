"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useResults, useSaveMarkdown } from "@/hooks/useJobs";
import { getPdfUrl, getExportZipUrl } from "@/lib/api";
import {
  parseMarkdownSections,
  reassembleMarkdown,
} from "@/lib/markdownSections";
import SectionPanel from "@/components/SectionPanel";
import MarkdownEditor from "@/components/MarkdownEditor";

// pdf.js cannot run server-side
const PdfViewer = dynamic(() => import("@/components/PdfViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-slate-100">
      <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  ),
});

type Mode = "sections" | "editor";

export default function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: results, isLoading } = useResults(id);
  const saveMutation = useSaveMarkdown();

  const [mode, setMode] = useState<Mode>("sections");
  const [activePage, setActivePage] = useState(1);
  const [editedMarkdown, setEditedMarkdown] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dividerPos, setDividerPos] = useState(50); // percentage

  // Sync source: "left" = PDF triggered, "right" = sections triggered, null = none
  const syncSourceRef = useRef<string | null>(null);

  // Dragging state
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize editedMarkdown from results
  useEffect(() => {
    if (results?.markdown && editedMarkdown === null) {
      setEditedMarkdown(results.markdown);
    }
  }, [results, editedMarkdown]);

  const markdown = editedMarkdown ?? results?.markdown ?? "";

  const sections = useMemo(
    () => parseMarkdownSections(markdown),
    [markdown]
  );

  // Count page sections (exclude header section 0)
  const pageSections = sections.filter((s) => s.pageNumber > 0);
  const maxPage = pageSections.length > 0
    ? Math.max(...pageSections.map((s) => s.pageNumber))
    : 0;

  const pdfUrl = getPdfUrl(id);

  const handlePageChange = useCallback((page: number) => {
    setActivePage(page);
  }, []);

  const handleDeleteSection = useCallback(
    (pageNumber: number) => {
      const remaining = sections.filter((s) => s.pageNumber !== pageNumber);
      const newMarkdown = reassembleMarkdown(remaining);
      setEditedMarkdown(newMarkdown);
    },
    [sections]
  );

  const handleSave = useCallback(
    (md: string) => {
      setEditedMarkdown(md);
      saveMutation.mutate({ jobId: id, markdown: md });
    },
    [id, saveMutation]
  );

  const handleSaveSections = useCallback(() => {
    saveMutation.mutate({ jobId: id, markdown });
  }, [id, markdown, saveMutation]);

  // Divider drag handlers
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setDividerPos(Math.max(25, Math.min(75, pct)));
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Has edits been made (compared to server version)?
  const hasEdits =
    editedMarkdown !== null && editedMarkdown !== results?.markdown;

  if (isLoading) {
    return (
      <div className="fixed inset-0 top-[64px] flex items-center justify-center bg-white">
        <div className="flex items-center gap-2">
          <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full" />
          <span className="text-sm text-slate-500">Loading review...</span>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="fixed inset-0 top-[64px] flex items-center justify-center bg-white">
        <p className="text-red-600 font-medium">Results not found.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 top-[64px] flex flex-col bg-white">
      {/* Top toolbar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white z-10">
        <div className="flex items-center gap-4">
          <Link
            href={`/results/${id}`}
            className="text-sm text-slate-500 hover:text-indigo-600 transition-colors"
          >
            &larr; Results
          </Link>
          <span className="text-sm font-mono text-slate-400">
            {id.slice(0, 8)}...
          </span>

          {/* Mode toggle */}
          <div className="flex gap-0.5 bg-slate-100 rounded-md p-0.5">
            <button
              className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                mode === "sections"
                  ? "bg-white shadow-sm text-indigo-700"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setMode("sections")}
            >
              Sections
            </button>
            <button
              className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                mode === "editor"
                  ? "bg-white shadow-sm text-indigo-700"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setMode("editor")}
            >
              Editor
            </button>
          </div>
        </div>

        {/* Page indicator + actions */}
        <div className="flex items-center gap-3">
          {/* Page navigator */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                syncSourceRef.current = "right";
                setActivePage(Math.max(1, activePage - 1));
              }}
              disabled={activePage <= 1}
              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors"
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
                  d="M15.75 19.5 8.25 12l7.5-7.5"
                />
              </svg>
            </button>
            <span className="text-xs text-slate-500 min-w-[48px] text-center">
              {activePage} / {maxPage}
            </span>
            <button
              onClick={() => {
                syncSourceRef.current = "right";
                setActivePage(Math.min(maxPage, activePage + 1));
              }}
              disabled={activePage >= maxPage}
              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors"
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
                  d="m8.25 4.5 7.5 7.5-7.5 7.5"
                />
              </svg>
            </button>
          </div>

          {/* Save button (for section mode) */}
          {mode === "sections" && hasEdits && (
            <button
              onClick={handleSaveSections}
              disabled={saveMutation.isPending}
              className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded transition-colors"
            >
              {saveMutation.isPending ? "Saving..." : "Save"}
            </button>
          )}

          {/* Copy */}
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(markdown);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 border border-slate-200 rounded transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>

          {/* Download .md */}
          <button
            onClick={() => {
              const blob = new Blob([markdown], { type: "text/markdown" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${id.slice(0, 8)}_reviewed.md`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 border border-slate-200 rounded transition-colors"
          >
            .md
          </button>

          {/* Download ZIP */}
          <button
            onClick={async () => {
              try {
                const res = await fetch(getExportZipUrl(id));
                if (!res.ok) {
                  const body = await res.json().catch(() => ({}));
                  alert(body.error || `Export failed: HTTP ${res.status}`);
                  return;
                }
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${id.slice(0, 8)}_results.zip`;
                a.click();
                URL.revokeObjectURL(url);
              } catch {
                alert("Failed to download ZIP");
              }
            }}
            className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 border border-slate-200 rounded transition-colors"
          >
            ZIP
          </button>

          {saveMutation.isSuccess && (
            <span className="text-xs text-emerald-600">Saved</span>
          )}
        </div>
      </div>

      {/* Split panels */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden relative">
        {/* Left: PDF Viewer */}
        <div style={{ width: `${dividerPos}%` }} className="h-full overflow-hidden">
          <PdfViewer
            url={pdfUrl}
            activePage={activePage}
            onPageChange={handlePageChange}
            syncSource={syncSourceRef}
          />
        </div>

        {/* Draggable divider */}
        <div
          onMouseDown={handleDividerMouseDown}
          className="w-1.5 shrink-0 bg-slate-200 hover:bg-indigo-400 cursor-col-resize transition-colors relative z-10"
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
        </div>

        {/* Right: Sections or Editor */}
        <div
          style={{ width: `${100 - dividerPos}%` }}
          className="h-full overflow-hidden"
        >
          {mode === "sections" ? (
            <SectionPanel
              sections={sections}
              trash={results.trash || []}
              activePage={activePage}
              onPageChange={handlePageChange}
              onDeleteSection={handleDeleteSection}
              syncSource={syncSourceRef}
            />
          ) : (
            <MarkdownEditor
              markdown={markdown}
              onSave={handleSave}
              isSaving={saveMutation.isPending}
            />
          )}
        </div>
      </div>
    </div>
  );
}
