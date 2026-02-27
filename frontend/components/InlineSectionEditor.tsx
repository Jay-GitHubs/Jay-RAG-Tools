"use client";

import { useEffect, useRef, useState } from "react";

interface InlineSectionEditorProps {
  rawContent: string;
  onSave: (newContent: string) => void;
  onCancel: () => void;
}

export default function InlineSectionEditor({
  rawContent,
  onSave,
  onCancel,
}: InlineSectionEditorProps) {
  const [value, setValue] = useState(rawContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel();
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSave(value);
    }
  };

  return (
    <div className="space-y-2">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full min-h-[200px] p-3 text-sm font-mono border border-indigo-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y bg-white"
        placeholder="Edit section content..."
      />
      <div className="flex items-center gap-2">
        <button
          onClick={() => onSave(value)}
          className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 border border-slate-300 hover:border-slate-400 rounded transition-colors"
        >
          Cancel
        </button>
        <span className="text-[10px] text-slate-400 ml-auto">
          Ctrl+Enter to save, Escape to cancel
        </span>
      </div>
    </div>
  );
}
