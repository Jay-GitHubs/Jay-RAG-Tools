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
    return <p className="text-gray-400">Loading results...</p>;
  }

  if (!results) {
    return <p className="text-red-500">Results not found.</p>;
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
        <h1 className="text-3xl font-bold">Results</h1>
        <p className="text-gray-500 mt-1">
          Job: {id.slice(0, 8)}... &middot; {results.image_count} images
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "markdown"
              ? "bg-white shadow text-gray-900"
              : "text-gray-600 hover:text-gray-900"
          }`}
          onClick={() => setTab("markdown")}
        >
          Markdown
        </button>
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "images"
              ? "bg-white shadow text-gray-900"
              : "text-gray-600 hover:text-gray-900"
          }`}
          onClick={() => setTab("images")}
        >
          Images ({results.image_count})
        </button>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border">
        {tab === "markdown" ? (
          results.markdown ? (
            <MarkdownViewer content={results.markdown} />
          ) : (
            <p className="text-gray-400">No markdown content available.</p>
          )
        ) : (
          <ImageGallery images={images} />
        )}
      </div>
    </div>
  );
}
