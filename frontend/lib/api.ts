import type {
  ConfigResponse,
  Job,
  ResultsResponse,
  UploadResponse,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getHealth(): Promise<{ status: string; version: string }> {
  return fetchJson("/api/health");
}

export async function getConfig(): Promise<ConfigResponse> {
  return fetchJson("/api/config");
}

export async function uploadPdf(
  file: File,
  config: Record<string, unknown>
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("config", JSON.stringify(config));
  return fetchJson("/api/upload", { method: "POST", body: formData });
}

export async function listJobs(): Promise<{ jobs: Job[] }> {
  return fetchJson("/api/jobs");
}

export async function getJob(id: string): Promise<Job> {
  return fetchJson(`/api/jobs/${id}`);
}

export async function deleteJob(id: string): Promise<{ message: string }> {
  return fetchJson(`/api/jobs/${id}`, { method: "DELETE" });
}

export async function getResults(jobId: string): Promise<ResultsResponse> {
  return fetchJson(`/api/results/${jobId}`);
}
