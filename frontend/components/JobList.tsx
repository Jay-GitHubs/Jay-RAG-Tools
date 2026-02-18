"use client";

import Link from "next/link";
import type { Job, JobStatus } from "@/lib/types";
import { timeAgo, formatDateTime } from "@/lib/format";

const statusColors: Record<JobStatus, string> = {
  pending: "bg-amber-100 text-amber-800 border border-amber-200",
  processing: "bg-blue-100 text-blue-800 border border-blue-200",
  completed: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  failed: "bg-red-100 text-red-800 border border-red-200",
};

interface JobListProps {
  jobs: Job[];
  onDelete?: (id: string) => void;
}

export default function JobList({ jobs, onDelete }: JobListProps) {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        </div>
        <p className="text-base font-medium text-slate-600">No jobs yet</p>
        <p className="text-sm text-slate-400 mt-1">Upload a PDF to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
            <th className="pb-3 pr-4">File</th>
            <th className="pb-3 pr-4">Status</th>
            <th className="pb-3 pr-4">Provider</th>
            <th className="pb-3 pr-4">Images</th>
            <th className="pb-3 pr-4">Created</th>
            <th className="pb-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <td className="py-3.5 pr-4">
                <Link
                  href={
                    job.status === "completed"
                      ? `/results/${job.id}`
                      : `/jobs/${job.id}`
                  }
                  className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                  {job.filename}
                </Link>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  {job.id.slice(0, 8)}...
                </p>
              </td>
              <td className="py-3.5 pr-4">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[job.status]}`}
                >
                  {job.status}
                </span>
              </td>
              <td className="py-3.5 pr-4 text-sm text-slate-700">
                {job.config.provider}
                {job.config.model && (
                  <span className="text-slate-400 ml-1">
                    / {job.config.model}
                  </span>
                )}
              </td>
              <td className="py-3.5 pr-4 text-sm text-slate-700 tabular-nums">
                {job.result?.image_count ?? "-"}
              </td>
              <td
                className="py-3.5 pr-4 text-sm text-slate-500"
                title={formatDateTime(job.created_at)}
              >
                {timeAgo(job.created_at)}
              </td>
              <td className="py-3.5">
                <div className="flex gap-1.5">
                  {job.status === "completed" && (
                    <Link
                      href={`/results/${job.id}`}
                      className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                    >
                      View
                    </Link>
                  )}
                  {job.status === "processing" && (
                    <Link
                      href={`/jobs/${job.id}`}
                      className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                    >
                      Progress
                    </Link>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(job.id)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
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
