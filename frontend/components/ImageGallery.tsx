"use client";

import { useState } from "react";
import { useDeleteImages } from "@/hooks/useJobs";

interface ImageMeta {
  image_file: string;
  page: number;
  description: string;
  type: string;
}

interface ImageGalleryProps {
  images: ImageMeta[];
  baseUrl?: string;
  jobId?: string;
  onDeleted?: (updatedMarkdown: string | undefined, deletedFiles: string[]) => void;
}

export default function ImageGallery({
  images,
  baseUrl = "/images",
  jobId,
  onDeleted,
}: ImageGalleryProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<ImageMeta | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteMutation = useDeleteImages();

  const canDelete = !!jobId;

  const toggleItem = (imageFile: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(imageFile)) next.delete(imageFile);
      else next.add(imageFile);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(images.map((img) => img.image_file)));
  };

  const deselectAll = () => {
    setSelected(new Set());
  };

  const handleDelete = async (imageFiles: string[]) => {
    if (!jobId || imageFiles.length === 0) return;
    setDeleteError(null);

    try {
      const result = await deleteMutation.mutateAsync({
        jobId,
        request: { image_files: imageFiles },
      });

      if (result.failed.length > 0) {
        setDeleteError(`Failed to delete: ${result.failed.join(", ")}`);
      }

      // Clear deleted items from selection
      setSelected((prev) => {
        const next = new Set(prev);
        result.deleted.forEach((f) => next.delete(f));
        return next;
      });

      // Close lightbox if it was showing a deleted image
      if (lightbox && result.deleted.includes(lightbox.image_file)) {
        setLightbox(null);
      }

      onDeleted?.(result.updated_markdown ?? undefined, result.deleted);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setDeleteError(msg);
    }
  };

  const handleDeleteSelected = () => handleDelete(Array.from(selected));
  const handleDeleteSingle = (imageFile: string) => handleDelete([imageFile]);

  if (images.length === 0) {
    return <p className="text-slate-500 text-sm">No images extracted.</p>;
  }

  return (
    <>
      {/* Toolbar */}
      {canDelete && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-md"
            >
              Select All ({images.length})
            </button>
            <button
              onClick={deselectAll}
              disabled={selected.size === 0}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-md disabled:opacity-40"
            >
              Deselect All
            </button>
          </div>
          <button
            onClick={handleDeleteSelected}
            disabled={selected.size === 0 || deleteMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            {deleteMutation.isPending ? (
              <>
                <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                Deleting...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
                Delete Selected ({selected.size})
              </>
            )}
          </button>
        </div>
      )}

      {(deleteMutation.isError || deleteError) && (
        <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md mb-4">
          Failed to delete: {deleteError || deleteMutation.error?.message}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((img) => {
          const isSelected = selected.has(img.image_file);
          return (
            <div
              key={img.image_file}
              className={`relative border rounded-lg overflow-hidden cursor-pointer transition-all group ${
                isSelected
                  ? "border-red-300 ring-2 ring-red-200"
                  : "border-slate-200 hover:shadow-md hover:border-indigo-300"
              }`}
            >
              {/* Checkbox overlay */}
              {canDelete && (
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleItem(img.image_file);
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                  />
                </div>
              )}

              {/* Single delete button on hover */}
              {canDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSingle(img.image_file);
                  }}
                  className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-red-600 text-white opacity-0 group-hover:opacity-100 hover:bg-red-700 transition-opacity"
                  title="Delete image"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              )}

              <div onClick={() => setLightbox(img)}>
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
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="bg-white rounded-xl max-w-4xl max-h-[90vh] overflow-auto p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={`${baseUrl}/${lightbox.image_file}`}
              alt={lightbox.description}
              className="max-w-full rounded-lg"
            />
            <p className="mt-3 text-sm text-slate-500">
              Page {lightbox.page} &middot; {lightbox.type}
            </p>
            <p className="mt-2 text-slate-700">{lightbox.description}</p>
            <div className="mt-4 flex gap-2">
              <button
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-colors"
                onClick={() => setLightbox(null)}
              >
                Close
              </button>
              {canDelete && (
                <button
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors"
                  disabled={deleteMutation.isPending}
                  onClick={() => handleDeleteSingle(lightbox.image_file)}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
