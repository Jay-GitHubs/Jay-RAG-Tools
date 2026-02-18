"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";

export function useJobs() {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: () => api.listJobs().then((r) => r.jobs),
    refetchInterval: 5000,
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ["job", id],
    queryFn: () => api.getJob(id),
    refetchInterval: 3000,
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      config,
    }: {
      file: File;
      config: Record<string, unknown>;
    }) => api.uploadPdf(file, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: api.getConfig,
    staleTime: 60000,
  });
}

export function useResults(jobId: string) {
  return useQuery({
    queryKey: ["results", jobId],
    queryFn: () => api.getResults(jobId),
  });
}
