"use client";

import { use, useState } from "react";
import MarkdownViewer from "@/components/MarkdownViewer";
import ImageGallery from "@/components/ImageGallery";
import { useResults } from "@/hooks/useJobs";

export default function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: results, isLoading } = useResults(id);
  const [tab, setTab] = useState<"markdown" | "images">("markdown");

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

      {/* Tab switcher */}
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
    </div>
  );
}
