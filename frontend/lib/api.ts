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

export function uploadPdfWithProgress(
  file: File,
  config: Record<string, unknown>,
  onProgress: (event: { loaded: number; total: number }) => void
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("config", JSON.stringify(config));

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress({ loaded: e.loaded, total: e.total });
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Invalid JSON response"));
        }
      } else {
        try {
          const body = JSON.parse(xhr.responseText);
          reject(new Error(body.error || `HTTP ${xhr.status}`));
        } catch {
          reject(new Error(`HTTP ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error("Network error"));
    xhr.open("POST", `${API_BASE}/api/upload`);
    xhr.send(formData);
  });
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

export function getExportZipUrl(jobId: string, imageBaseUrl?: string): string {
  const base = `${API_BASE}/api/results/${jobId}/export`;
  if (imageBaseUrl) {
    return `${base}?image_base_url=${encodeURIComponent(imageBaseUrl)}`;
  }
  return base;
}
