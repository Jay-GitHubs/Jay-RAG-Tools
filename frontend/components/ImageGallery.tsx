"use client";

import { useState } from "react";

interface ImageMeta {
  image_file: string;
  page: number;
  description: string;
  type: string;
}

interface ImageGalleryProps {
  images: ImageMeta[];
  baseUrl?: string;
}

export default function ImageGallery({
  images,
  baseUrl = "/images",
}: ImageGalleryProps) {
  const [selected, setSelected] = useState<ImageMeta | null>(null);

  if (images.length === 0) {
    return <p className="text-slate-500 text-sm">No images extracted.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((img) => (
          <div
            key={img.image_file}
            className="border border-slate-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all group"
            onClick={() => setSelected(img)}
          >
            <img
              src={`${baseUrl}/${img.image_file}`}
              alt={img.description}
              className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            <div className="p-3">
              <p className="text-xs text-slate-500">
                Page {img.page} &middot; {img.type}
              </p>
              <p className="text-sm text-slate-700 line-clamp-2 mt-1">{img.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-xl max-w-4xl max-h-[90vh] overflow-auto p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={`${baseUrl}/${selected.image_file}`}
              alt={selected.description}
              className="max-w-full rounded-lg"
            />
            <p className="mt-3 text-sm text-slate-500">
              Page {selected.page} &middot; {selected.type}
            </p>
            <p className="mt-2 text-slate-700">{selected.description}</p>
            <button
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-colors"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
