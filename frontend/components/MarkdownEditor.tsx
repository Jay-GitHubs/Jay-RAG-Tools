"use client";

import { useEffect, useState } from "react";

interface MarkdownEditorProps {
  markdown: string;
  onSave: (markdown: string) => void;
  isSaving: boolean;
}

export default function MarkdownEditor({
  markdown,
  onSave,
  isSaving,
}: MarkdownEditorProps) {
  const [value, setValue] = useState(markdown);
  const isDirty = value !== markdown;

  // Sync when external markdown changes (e.g., after section delete)
  useEffect(() => {
    setValue(markdown);
  }, [markdown]);

  return (
    <div className="h-full flex flex-col">
      {/* Editor header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-50 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">
            Raw Markdown
          </span>
          {isDirty && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-700">
              Unsaved changes
            </span>
          )}
        </div>
        <button
          onClick={() => onSave(value)}
          disabled={!isDirty || isSaving}
          className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Textarea */}
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 w-full p-4 font-mono text-sm text-slate-800 bg-white resize-none focus:outline-none"
        spellCheck={false}
      />
    </div>
  );
}
