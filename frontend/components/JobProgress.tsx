"use client";

import { useJobProgress } from "@/hooks/useWebSocket";

interface JobProgressProps {
  jobId: string;
}

export default function JobProgress({ jobId }: JobProgressProps) {
  const { progress, connected } = useJobProgress(jobId);

  if (!progress) {
    return (
      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full" />
          <span className="text-sm text-slate-600">
            {connected ? "Waiting for progress..." : "Connecting..."}
          </span>
        </div>
      </div>
    );
  }

  const percent =
    progress.total_pages > 0
      ? Math.round((progress.current_page / progress.total_pages) * 100)
      : 0;

  return (
    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-slate-900 capitalize">{progress.phase}</span>
        <span className="text-slate-600 tabular-nums">
          {progress.current_page}/{progress.total_pages} pages
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-slate-500">
        <span>{progress.message}</span>
        <span className="tabular-nums">{progress.images_processed} images processed</span>
      </div>
    </div>
  );
}
