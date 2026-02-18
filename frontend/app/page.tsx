"use client";

import Link from "next/link";
import JobList from "@/components/JobList";
import { useJobs, useDeleteJob } from "@/hooks/useJobs";

export default function Dashboard() {
  const { data: jobs, isLoading } = useJobs();
  const deleteJob = useDeleteJob();

  const recentJobs = jobs?.slice(0, 5) || [];
  const completed = jobs?.filter((j) => j.status === "completed").length || 0;
  const processing = jobs?.filter((j) => j.status === "processing").length || 0;
  const failed = jobs?.filter((j) => j.status === "failed").length || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Thai-first PDF Vision Processor for RAG pipelines
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 border-l-4 border-l-indigo-500">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Jobs</p>
          <p className="text-3xl font-bold mt-2 text-slate-900">{jobs?.length || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 border-l-4 border-l-emerald-500">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Completed</p>
          <p className="text-3xl font-bold mt-2 text-emerald-600">{completed}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 border-l-4 border-l-blue-500">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Processing</p>
          <p className="text-3xl font-bold mt-2 text-blue-600">{processing}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 border-l-4 border-l-red-500">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Failed</p>
          <p className="text-3xl font-bold mt-2 text-red-600">{failed}</p>
        </div>
      </div>

      {/* Quick Upload */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">Quick Upload</h2>
          <Link
            href="/upload"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
          >
            Upload PDF
          </Link>
        </div>
        <p className="text-slate-500 text-sm">
          Upload a PDF to extract text and images with Vision LLM for RAG
          pipelines.
        </p>
      </div>

      {/* Recent Jobs */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Jobs</h2>
          <Link
            href="/jobs"
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            View all &rarr;
          </Link>
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2 py-8 justify-center">
            <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full" />
            <span className="text-sm text-slate-500">Loading jobs...</span>
          </div>
        ) : (
          <JobList
            jobs={recentJobs}
            onDelete={(id) => deleteJob.mutate(id)}
          />
        )}
      </div>
    </div>
  );
}
