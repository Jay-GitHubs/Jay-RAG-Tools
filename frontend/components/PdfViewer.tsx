"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import "@/lib/pdfWorker";

interface PdfViewerProps {
  url: string;
  activePage: number;
  onPageChange: (page: number) => void;
  /** Ref source: who triggered the navigation — prevents infinite sync loops */
  syncSource: React.RefObject<string | null>;
}

export default function PdfViewer({
  url,
  activePage,
  onPageChange,
  syncSource,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [containerWidth, setContainerWidth] = useState(600);

  // Track container width for responsive page sizing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Leave 32px padding
        setContainerWidth(entry.contentRect.width - 32);
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // IntersectionObserver to detect which page is visible
  useEffect(() => {
    const container = containerRef.current;
    if (!container || numPages === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Don't update if the right panel initiated the scroll
        if (syncSource.current === "right") return;

        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
            const pageNum = Number(entry.target.getAttribute("data-page"));
            if (pageNum && pageNum !== activePage) {
              syncSource.current = "left";
              onPageChange(pageNum);
              // Reset sync source after a short delay
              setTimeout(() => {
                if (syncSource.current === "left") syncSource.current = null;
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

    pageRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [numPages, activePage, onPageChange, syncSource]);

  // Scroll to page when right panel navigates
  useEffect(() => {
    if (syncSource.current !== "right") return;
    const el = pageRefs.current.get(activePage);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activePage, syncSource]);

  const setPageRef = useCallback(
    (page: number) => (el: HTMLDivElement | null) => {
      if (el) {
        pageRefs.current.set(page, el);
      } else {
        pageRefs.current.delete(page);
      }
    },
    []
  );

  function onDocumentLoadSuccess({ numPages: n }: { numPages: number }) {
    setNumPages(n);
  }

  return (
    <div ref={containerRef} className="h-full overflow-y-auto bg-slate-100 p-4">
      <Document
        file={url}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
          </div>
        }
        error={
          <div className="text-center py-12 text-red-600">
            Failed to load PDF. The original file may have been deleted.
          </div>
        }
      >
        {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
          <div
            key={pageNum}
            ref={setPageRef(pageNum)}
            data-page={pageNum}
            className="mb-4 shadow-md bg-white"
          >
            <Page
              pageNumber={pageNum}
              width={containerWidth > 0 ? containerWidth : undefined}
              loading={
                <div className="h-[400px] flex items-center justify-center bg-slate-50">
                  <span className="text-xs text-slate-400">
                    Loading page {pageNum}...
                  </span>
                </div>
              }
            />
          </div>
        ))}
      </Document>
    </div>
  );
}
