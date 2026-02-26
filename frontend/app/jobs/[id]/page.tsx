"use client";

import { use } from "react";
import Link from "next/link";
import JobProgressComponent from "@/components/JobProgress";
import { useJob, useCancelJob } from "@/hooks/useJobs";
import { formatDateTime, formatDuration } from "@/lib/format";
import ElapsedTimer from "@/components/ElapsedTimer";

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: job, isLoading } = useJob(id);
  const cancelJob = useCancelJob();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 justify-center">
        <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full" />
        <span className="text-sm text-slate-500">Loading...</span>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 font-medium">Job not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{job.filename}</h1>
        <p className="text-slate-500 mt-1 font-mono text-sm">Job: {job.id}</p>
      </div>

      {/* Status */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Status</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500">Status:</span>{" "}
            <span className="font-medium text-slate-900 capitalize">{job.status}</span>
          </div>
          <div>
            <span className="text-slate-500">Provider:</span>{" "}
            <span className="font-medium text-slate-900">
              {job.config.provider}
              {job.config.model && ` / ${job.config.model}`}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Language:</span>{" "}
            <span className="font-medium text-slate-900">{job.config.language}</span>
          </div>
          <div>
            <span className="text-slate-500">Storage:</span>{" "}
            <span className="font-medium text-slate-900">{job.config.storage}</span>
          </div>
          <div>
            <span className="text-slate-500">DPI:</span>{" "}
            <span className="font-medium text-slate-900">{job.config.dpi ?? "default"}</span>
          </div>
          <div>
            <span className="text-slate-500">Created:</span>{" "}
            <span className="font-medium text-slate-900">{formatDateTime(job.created_at)}</span>
          </div>
          <div>
            <span className="text-slate-500">Started:</span>{" "}
            <span className="font-medium text-slate-900">
              {job.started_at ? formatDateTime(job.started_at) : "-"}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Finished:</span>{" "}
            <span className="font-medium text-slate-900">
              {job.completed_at ? formatDateTime(job.completed_at) : "-"}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Duration:</span>{" "}
            <span className="font-medium text-slate-900">
              {job.status === "processing" && job.started_at ? (
                <ElapsedTimer startedAt={job.started_at} />
              ) : job.duration_seconds != null ? (
                formatDuration(job.duration_seconds)
              ) : (
                "-"
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Progress */}
      {(job.status === "pending" || job.status === "processing") && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-900">Progress</h2>
            <button
              onClick={() => cancelJob.mutate(id)}
              disabled={cancelJob.isPending}
              className="px-4 py-2 text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors disabled:opacity-50"
            >
              {cancelJob.isPending ? "Cancelling..." : "Cancel Job"}
            </button>
          </div>
          <JobProgressComponent jobId={id} />
        </div>
      )}

      {/* Error */}
      {job.status === "failed" && job.error && (
        <div className="bg-red-50 rounded-xl p-6 border border-red-200">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-700 text-sm font-mono">{job.error}</p>
        </div>
      )}

      {/* Cancelled */}
      {job.status === "cancelled" && (
        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-700 mb-2">Cancelled</h2>
          <p className="text-slate-600 text-sm">This job was cancelled by the user.</p>
        </div>
      )}

      {/* Completed */}
      {job.status === "completed" && (
        <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-200">
          <h2 className="text-lg font-semibold text-emerald-800 mb-2">
            Completed
          </h2>
          <p className="text-emerald-700 text-sm mb-4">
            {job.result?.image_count} images processed.
          </p>
          <Link
            href={`/results/${id}`}
            className="inline-flex px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
          >
            View Results
          </Link>
        </div>
      )}
    </div>
  );
}
