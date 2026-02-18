"use client";

import { use } from "react";
import Link from "next/link";
import JobProgressComponent from "@/components/JobProgress";
import { useJob } from "@/hooks/useJobs";
import { formatDateTime } from "@/lib/format";

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: job, isLoading } = useJob(id);

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
            <span className="text-slate-500">Created:</span>{" "}
            <span className="font-medium text-slate-900">{formatDateTime(job.created_at)}</span>
          </div>
          <div>
            <span className="text-slate-500">Updated:</span>{" "}
            <span className="font-medium text-slate-900">{formatDateTime(job.updated_at)}</span>
          </div>
        </div>
      </div>

      {/* Progress */}
      {(job.status === "pending" || job.status === "processing") && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Progress</h2>
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
