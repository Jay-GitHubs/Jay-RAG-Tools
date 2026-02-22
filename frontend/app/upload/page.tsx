"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UploadForm from "@/components/UploadForm";
import PipelineConfig from "@/components/PipelineConfig";
import { useUpload } from "@/hooks/useJobs";

export default function UploadPage() {
  const router = useRouter();
  const upload = useUpload();
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [config, setConfig] = useState({
    provider: "ollama",
    model: "qwen2.5vl",
    language: "th",
    storage: "local",
    table_extraction: false,
    text_only: false,
    start_page: "",
    end_page: "",
    s3_bucket: "",
    s3_prefix: "",
    storage_path: "",
  });

  const handleSubmit = async () => {
    if (!file) return;
    try {
      setUploadProgress(0);
      const { start_page, end_page, ...rest } = config;
      const apiConfig: Record<string, unknown> = { ...rest };
      if (start_page) apiConfig.start_page = Number(start_page);
      if (end_page) apiConfig.end_page = Number(end_page);
      const result = await upload.mutateAsync({
        file,
        config: apiConfig,
        onProgress: (e) => {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      router.push(`/jobs/${result.job_id}`);
    } catch {
      // Error handled by react-query
    } finally {
      setUploadProgress(null);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Upload PDF</h1>
        <p className="text-slate-500 mt-1">
          Configure the processing pipeline and upload a PDF document.
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <UploadForm onFileSelect={setFile} />
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <PipelineConfig config={config} onChange={setConfig} />
      </div>

      {uploadProgress !== null ? (
        <div className="space-y-2">
          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-sm text-slate-600 text-center font-medium">
            Uploading... {uploadProgress}%
          </p>
        </div>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={!file || upload.isPending}
          className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm text-base"
        >
          Start Processing
        </button>
      )}

      {upload.isError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">
            Error: {(upload.error as Error).message}
          </p>
        </div>
      )}
    </div>
  );
}
