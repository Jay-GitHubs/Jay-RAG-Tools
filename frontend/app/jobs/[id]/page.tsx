"use client";

import { use } from "react";
import Link from "next/link";
import JobProgressComponent from "@/components/JobProgress";
import { useJob } from "@/hooks/useJobs";

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: job, isLoading } = useJob(id);

  if (isLoading) {
    return <p className="text-gray-400">Loading...</p>;
  }

  if (!job) {
    return <p className="text-red-500">Job not found.</p>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">{job.filename}</h1>
        <p className="text-gray-500 mt-1">Job: {job.id}</p>
      </div>

      {/* Status */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h2 className="text-lg font-semibold mb-3">Status</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Status:</span>{" "}
            <span className="font-medium capitalize">{job.status}</span>
          </div>
          <div>
            <span className="text-gray-500">Provider:</span>{" "}
            <span className="font-medium">
              {job.config.provider}
              {job.config.model && ` / ${job.config.model}`}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Language:</span>{" "}
            <span className="font-medium">{job.config.language}</span>
          </div>
          <div>
            <span className="text-gray-500">Storage:</span>{" "}
            <span className="font-medium">{job.config.storage}</span>
          </div>
        </div>
      </div>

      {/* Progress */}
      {(job.status === "pending" || job.status === "processing") && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-semibold mb-3">Progress</h2>
          <JobProgressComponent jobId={id} />
        </div>
      )}

      {/* Error */}
      {job.status === "failed" && job.error && (
        <div className="bg-red-50 rounded-xl p-6 border border-red-200">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-700 text-sm">{job.error}</p>
        </div>
      )}

      {/* Completed */}
      {job.status === "completed" && (
        <div className="bg-green-50 rounded-xl p-6 border border-green-200">
          <h2 className="text-lg font-semibold text-green-800 mb-2">
            Completed
          </h2>
          <p className="text-green-700 text-sm mb-4">
            {job.result?.image_count} images processed.
          </p>
          <Link
            href={`/results/${id}`}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >
            View Results
          </Link>
        </div>
      )}
    </div>
  );
}
