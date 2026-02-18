"use client";

import JobList from "@/components/JobList";
import { useJobs, useDeleteJob } from "@/hooks/useJobs";

export default function JobsPage() {
  const { data: jobs, isLoading } = useJobs();
  const deleteJob = useDeleteJob();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Jobs</h1>
        <p className="text-slate-500 mt-1">All PDF processing jobs.</p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        {isLoading ? (
          <div className="flex items-center gap-2 py-8 justify-center">
            <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full" />
            <span className="text-sm text-slate-500">Loading jobs...</span>
          </div>
        ) : (
          <JobList
            jobs={jobs || []}
            onDelete={(id) => deleteJob.mutate(id)}
          />
        )}
      </div>
    </div>
  );
}
