"use client";

import Link from "next/link";
import type { Job, JobStatus } from "@/lib/types";

const statusColors: Record<JobStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

interface JobListProps {
  jobs: Job[];
  onDelete?: (id: string) => void;
}

export default function JobList({ jobs, onDelete }: JobListProps) {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No jobs yet</p>
        <p className="text-sm mt-1">Upload a PDF to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left text-sm text-gray-500">
            <th className="pb-3 pr-4">File</th>
            <th className="pb-3 pr-4">Status</th>
            <th className="pb-3 pr-4">Provider</th>
            <th className="pb-3 pr-4">Images</th>
            <th className="pb-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id} className="border-b hover:bg-gray-50">
              <td className="py-3 pr-4">
                <Link
                  href={
                    job.status === "completed"
                      ? `/results/${job.id}`
                      : `/jobs/${job.id}`
                  }
                  className="text-blue-600 hover:underline font-medium"
                >
                  {job.filename}
                </Link>
                <p className="text-xs text-gray-400 mt-0.5">
                  {job.id.slice(0, 8)}...
                </p>
              </td>
              <td className="py-3 pr-4">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[job.status]}`}
                >
                  {job.status}
                </span>
              </td>
              <td className="py-3 pr-4 text-sm">
                {job.config.provider}
                {job.config.model && (
                  <span className="text-gray-400 ml-1">
                    / {job.config.model}
                  </span>
                )}
              </td>
              <td className="py-3 pr-4 text-sm">
                {job.result?.image_count ?? "-"}
              </td>
              <td className="py-3">
                <div className="flex gap-2">
                  {job.status === "completed" && (
                    <Link
                      href={`/results/${job.id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View
                    </Link>
                  )}
                  {job.status === "processing" && (
                    <Link
                      href={`/jobs/${job.id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Progress
                    </Link>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(job.id)}
                      className="text-sm text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
