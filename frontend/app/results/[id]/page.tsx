"use client";

import { use, useState } from "react";
import MarkdownViewer from "@/components/MarkdownViewer";
import ImageGallery from "@/components/ImageGallery";
import DeployModal from "@/components/DeployModal";
import { useResults } from "@/hooks/useJobs";
import { getExportZipUrl } from "@/lib/api";

export default function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: results, isLoading } = useResults(id);
  const [tab, setTab] = useState<"markdown" | "images">("markdown");
  const [copied, setCopied] = useState(false);
  const [imageBaseUrl, setImageBaseUrl] = useState("");
  const [showDeploy, setShowDeploy] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 justify-center">
        <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full" />
        <span className="text-sm text-slate-500">Loading results...</span>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 font-medium">Results not found.</p>
      </div>
    );
  }

  const images = (results.metadata as unknown as Array<{
    image_file: string;
    page: number;
    description: string;
    type: string;
  }>) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Results</h1>
        <p className="text-slate-500 mt-1 font-mono text-sm">
          Job: {id.slice(0, 8)}... &middot; {results.image_count} images
        </p>
      </div>

      {/* Tab switcher + toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === "markdown"
                ? "bg-white shadow-sm text-indigo-700"
                : "text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setTab("markdown")}
          >
            Markdown
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === "images"
                ? "bg-white shadow-sm text-indigo-700"
                : "text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setTab("images")}
          >
            Images ({results.image_count})
          </button>
        </div>

        <div className="flex gap-2">
          {tab === "markdown" && results.markdown && (
            <>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(results.markdown!);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                </svg>
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([results.markdown!], { type: "text/markdown" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${id.slice(0, 8)}_enriched.md`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download .md
              </button>
            </>
          )}
          <button
            onClick={async () => {
              try {
                const res = await fetch(getExportZipUrl(id));
                if (!res.ok) {
                  const body = await res.json().catch(() => ({}));
                  alert(body.error || `Export failed: HTTP ${res.status}`);
                  return;
                }
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${id.slice(0, 8)}_results.zip`;
                a.click();
                URL.revokeObjectURL(url);
              } catch {
                alert("Failed to download ZIP");
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
            Download ZIP
          </button>
          <button
            onClick={() => setShowDeploy(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.58-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
            </svg>
            Deploy
          </button>
        </div>
      </div>

      {/* Export with HTML image tags */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          value={imageBaseUrl}
          onChange={(e) => setImageBaseUrl(e.target.value)}
          placeholder="e.g. http://192.168.0.10:8444/rag-images"
          className="px-3 py-1.5 text-xs border border-slate-200 rounded-md w-72 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        <button
          disabled={!imageBaseUrl.trim()}
          onClick={async () => {
            try {
              const res = await fetch(getExportZipUrl(id, imageBaseUrl));
              if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                alert(body.error || `Export failed: HTTP ${res.status}`);
                return;
              }
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${id.slice(0, 8)}_results.zip`;
              a.click();
              URL.revokeObjectURL(url);
            } catch {
              alert("Failed to download ZIP");
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-md transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
          </svg>
          Export ZIP with HTML images
        </button>
        <span className="text-xs text-slate-400">Converts [IMAGE:] tags to &lt;img&gt; for RAG platforms</span>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        {tab === "markdown" ? (
          results.markdown ? (
            <MarkdownViewer content={results.markdown} />
          ) : (
            <p className="text-slate-400">No markdown content available.</p>
          )
        ) : (
          <ImageGallery images={images} />
        )}
      </div>

      {showDeploy && (
        <DeployModal
          jobId={id}
          onClose={() => setShowDeploy(false)}
          initialImageBaseUrl={imageBaseUrl}
        />
      )}
    </div>
  );
}
