"use client";

import { useState } from "react";
import type { TrashDetection, TrashTypeName } from "@/lib/types";
import { useCleanResults } from "@/hooks/useJobs";

const TYPE_LABELS: Record<TrashTypeName, string> = {
  table_of_contents: "TOC",
  boilerplate: "Boilerplate",
  blank_page: "Blank",
  header_footer: "Header/Footer",
};

const TYPE_COLORS: Record<TrashTypeName, string> = {
  table_of_contents: "bg-amber-100 text-amber-800",
  boilerplate: "bg-red-100 text-red-800",
  blank_page: "bg-slate-100 text-slate-600",
  header_footer: "bg-blue-100 text-blue-800",
};

interface TrashPanelProps {
  jobId: string;
  items: TrashDetection[];
  onCleaned: (cleanedMarkdown: string) => void;
}

export default function TrashPanel({ jobId, items, onCleaned }: TrashPanelProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const cleanMutation = useCleanResults();

  // Items that can be removed (have a page number > 0, not header/footer)
  const removable = items.filter(
    (item) => item.page > 0 && item.trash_type !== "header_footer"
  );
  const informational = items.filter(
    (item) => item.page === 0 || item.trash_type === "header_footer"
  );

  const toggleItem = (page: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(page)) next.delete(page);
      else next.add(page);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(removable.map((item) => item.page)));
  };

  const deselectAll = () => {
    setSelected(new Set());
  };

  const handleClean = async () => {
    const pages = Array.from(selected).sort((a, b) => a - b);
    if (pages.length === 0) return;

    try {
      const result = await cleanMutation.mutateAsync({
        jobId,
        request: { remove_pages: pages },
      });
      onCleaned(result.cleaned_markdown);
    } catch {
      // Error is handled by mutation state
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        No trash detected in this document.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {removable.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-md"
            >
              Select All ({removable.length})
            </button>
            <button
              onClick={deselectAll}
              disabled={selected.size === 0}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-md disabled:opacity-40"
            >
              Deselect All
            </button>
          </div>
          <button
            onClick={handleClean}
            disabled={selected.size === 0 || cleanMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            {cleanMutation.isPending ? (
              <>
                <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                Cleaning...
              </>
            ) : (
              <>Remove Selected ({selected.size})</>
            )}
          </button>
        </div>
      )}

      {cleanMutation.isError && (
        <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
          Failed to clean: {cleanMutation.error?.message}
        </div>
      )}

      {/* Removable items */}
      {removable.length > 0 && (
        <div className="space-y-2">
          {removable.map((item) => (
            <TrashCard
              key={`${item.page}-${item.trash_type}`}
              item={item}
              selectable
              selected={selected.has(item.page)}
              onToggle={() => toggleItem(item.page)}
            />
          ))}
        </div>
      )}

      {/* Informational items (header/footer — already stripped) */}
      {informational.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mt-4">
            Already stripped (informational)
          </p>
          {informational.map((item, i) => (
            <TrashCard
              key={`info-${i}`}
              item={item}
              selectable={false}
              selected={false}
              onToggle={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TrashCard({
  item,
  selectable,
  selected,
  onToggle,
}: {
  item: TrashDetection;
  selectable: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
        selected
          ? "border-red-300 bg-red-50"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      {selectable && (
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {item.page > 0 && (
            <span className="text-sm font-mono font-medium text-slate-700">
              Page {item.page}
            </span>
          )}
          <span
            className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
              TYPE_COLORS[item.trash_type]
            }`}
          >
            {TYPE_LABELS[item.trash_type]}
          </span>
          <span className="text-xs text-slate-400">
            {Math.round(item.confidence * 100)}% confidence
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">{item.reason}</p>
        {item.preview && (
          <p className="text-xs text-slate-400 mt-1 truncate font-mono">
            {item.preview}
          </p>
        )}
      </div>
    </div>
  );
}
