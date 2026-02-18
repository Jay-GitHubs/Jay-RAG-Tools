"use client";

import { useJobProgress } from "@/hooks/useWebSocket";

interface JobProgressProps {
  jobId: string;
}

export default function JobProgress({ jobId }: JobProgressProps) {
  const { progress, connected } = useJobProgress(jobId);

  if (!progress) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          <span className="text-sm text-gray-600">
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
    <div className="p-4 bg-gray-50 rounded-lg space-y-3">
      <div className="flex justify-between text-sm">
        <span className="font-medium capitalize">{progress.phase}</span>
        <span className="text-gray-600">
          {progress.current_page}/{progress.total_pages} pages
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className="bg-blue-500 h-3 rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span>{progress.message}</span>
        <span>{progress.images_processed} images processed</span>
      </div>
    </div>
  );
}
