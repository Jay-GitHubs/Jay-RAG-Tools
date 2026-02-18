"use client";

import JobList from "@/components/JobList";
import { useJobs, useDeleteJob } from "@/hooks/useJobs";

export default function JobsPage() {
  const { data: jobs, isLoading } = useJobs();
  const deleteJob = useDeleteJob();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Jobs</h1>
        <p className="text-gray-500 mt-1">All PDF processing jobs.</p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border">
        {isLoading ? (
          <p className="text-gray-400">Loading...</p>
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
