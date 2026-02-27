"use client";

import { useEffect } from "react";

interface UseKeyboardShortcutsOptions {
  onSave: () => void;
  onToggleSearch: () => void;
  onUndo: () => void;
  hasEdits: boolean;
}

export function useKeyboardShortcuts({
  onSave,
  onToggleSearch,
  onUndo,
  hasEdits,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      if (e.key === "s") {
        e.preventDefault();
        onSave();
      } else if (e.key === "f") {
        e.preventDefault();
        onToggleSearch();
      } else if (e.key === "z" && !e.shiftKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "TEXTAREA" || tag === "INPUT") return;
        e.preventDefault();
        onUndo();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onSave, onToggleSearch, onUndo]);

  useEffect(() => {
    if (!hasEdits) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasEdits]);
}
