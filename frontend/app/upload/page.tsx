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
  const [config, setConfig] = useState({
    provider: "ollama",
    model: "qwen2.5vl",
    language: "th",
    storage: "local",
    table_extraction: false,
    s3_bucket: "",
    s3_prefix: "",
    storage_path: "",
  });

  const handleSubmit = async () => {
    if (!file) return;
    try {
      const result = await upload.mutateAsync({ file, config });
      router.push(`/jobs/${result.job_id}`);
    } catch {
      // Error handled by react-query
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

      <button
        onClick={handleSubmit}
        disabled={!file || upload.isPending}
        className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm text-base"
      >
        {upload.isPending ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            Uploading...
          </span>
        ) : (
          "Start Processing"
        )}
      </button>

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
