"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface SearchBarProps {
  visible: boolean;
  onClose: () => void;
  markdown: string;
  onReplace: (newMarkdown: string) => void;
  onQueryChange?: (query: string) => void;
  onCaseSensitiveChange?: (caseSensitive: boolean) => void;
}

export default function SearchBar({
  visible,
  onClose,
  markdown,
  onReplace,
  onQueryChange,
  onCaseSensitiveChange,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [currentMatch, setCurrentMatch] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Compute matches
  const matches = useMemo(() => {
    if (!query) return [];
    try {
      const flags = caseSensitive ? "g" : "gi";
      const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
      const result: { index: number; length: number }[] = [];
      let match;
      while ((match = regex.exec(markdown)) !== null) {
        result.push({ index: match.index, length: match[0].length });
      }
      return result;
    } catch {
      return [];
    }
  }, [query, markdown, caseSensitive]);

  // Reset current match when matches change
  useEffect(() => {
    if (matches.length > 0) {
      setCurrentMatch(0);
    }
  }, [matches.length]);

  // Focus search input when visible
  useEffect(() => {
    if (visible) {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }
  }, [visible]);

  const goNext = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatch((prev) => (prev + 1) % matches.length);
  }, [matches.length]);

  const goPrev = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatch((prev) => (prev - 1 + matches.length) % matches.length);
  }, [matches.length]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      goPrev();
    } else if (e.key === "Enter") {
      e.preventDefault();
      goNext();
    }
  };

  const handleReplaceCurrent = () => {
    if (matches.length === 0 || !matches[currentMatch]) return;
    const m = matches[currentMatch];
    const newMd = markdown.slice(0, m.index) + replaceText + markdown.slice(m.index + m.length);
    onReplace(newMd);
    // After replace, adjust current match
    if (currentMatch >= matches.length - 1) {
      setCurrentMatch(Math.max(0, matches.length - 2));
    }
  };

  const handleReplaceAll = () => {
    if (!query || matches.length === 0) return;
    const flags = caseSensitive ? "g" : "gi";
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
    const newMd = markdown.replace(regex, replaceText);
    onReplace(newMd);
  };

  if (!visible) return null;

  return (
    <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-2 space-y-2">
      {/* Search row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              onQueryChange?.(e.target.value);
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search..."
            className="w-full pl-3 pr-20 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          {query && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
              {matches.length > 0
                ? `${currentMatch + 1} / ${matches.length}`
                : "No results"}
            </span>
          )}
        </div>

        {/* Case sensitive toggle */}
        <button
          onClick={() => {
            const next = !caseSensitive;
            setCaseSensitive(next);
            onCaseSensitiveChange?.(next);
          }}
          className={`px-2 py-1.5 text-xs font-mono font-bold rounded border transition-colors ${
            caseSensitive
              ? "bg-indigo-100 border-indigo-300 text-indigo-700"
              : "border-slate-300 text-slate-400 hover:text-slate-600"
          }`}
          title="Case sensitive"
        >
          Aa
        </button>

        {/* Prev / Next */}
        <button
          onClick={goPrev}
          disabled={matches.length === 0}
          className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors"
          title="Previous match (Shift+Enter)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
        </button>
        <button
          onClick={goNext}
          disabled={matches.length === 0}
          className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors"
          title="Next match (Enter)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {/* Toggle replace */}
        <button
          onClick={() => setShowReplace(!showReplace)}
          className={`px-2 py-1.5 text-xs font-medium rounded border transition-colors ${
            showReplace
              ? "bg-indigo-100 border-indigo-300 text-indigo-700"
              : "border-slate-300 text-slate-500 hover:text-slate-700"
          }`}
        >
          Replace
        </button>

        {/* Close */}
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors"
          title="Close (Escape)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Replace row */}
      {showReplace && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            placeholder="Replace with..."
            className="flex-1 pl-3 pr-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            onClick={handleReplaceCurrent}
            disabled={matches.length === 0}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 hover:border-slate-400 rounded disabled:opacity-30 transition-colors"
          >
            Replace
          </button>
          <button
            onClick={handleReplaceAll}
            disabled={matches.length === 0}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 hover:border-slate-400 rounded disabled:opacity-30 transition-colors"
          >
            Replace All
          </button>
        </div>
      )}
    </div>
  );
}
