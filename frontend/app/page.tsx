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
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Thai-first PDF Vision Processor for RAG pipelines
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <p className="text-sm text-gray-500">Total Jobs</p>
          <p className="text-3xl font-bold mt-1">{jobs?.length || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-3xl font-bold mt-1 text-green-600">{completed}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <p className="text-sm text-gray-500">Processing</p>
          <p className="text-3xl font-bold mt-1 text-blue-600">{processing}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <p className="text-sm text-gray-500">Failed</p>
          <p className="text-3xl font-bold mt-1 text-red-600">{failed}</p>
        </div>
      </div>

      {/* Quick Upload */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Quick Upload</h2>
          <Link
            href="/upload"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Upload PDF
          </Link>
        </div>
        <p className="text-gray-500 text-sm">
          Upload a PDF to extract text and images with Vision LLM for RAG
          pipelines.
        </p>
      </div>

      {/* Recent Jobs */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Jobs</h2>
          <Link
            href="/jobs"
            className="text-sm text-blue-600 hover:underline"
          >
            View all
          </Link>
        </div>
        {isLoading ? (
          <p className="text-gray-400">Loading...</p>
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
