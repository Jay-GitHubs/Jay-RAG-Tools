"use client";

import { useState, useRef, type DragEvent } from "react";

interface UploadFormProps {
  onFileSelect: (file: File) => void;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export default function UploadForm({ onFileSelect }: UploadFormProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSelect = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 50 MB.`);
      setSelectedFile(null);
      return;
    }
    setError(null);
    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") {
      validateAndSelect(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSelect(file);
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
        dragOver
          ? "border-indigo-500 bg-indigo-50"
          : selectedFile
            ? "border-emerald-300 bg-emerald-50/50"
            : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleFileChange}
      />
      {selectedFile ? (
        <div>
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <p className="font-semibold text-lg text-slate-900">{selectedFile.name}</p>
          <p className="text-slate-500 text-sm mt-1">
            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
          </p>
          <p className="text-indigo-600 text-xs mt-2 font-medium">Click to change file</p>
        </div>
      ) : (
        <div>
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <p className="text-lg font-medium text-slate-900">
            Drop a PDF here or click to browse
          </p>
          <p className="text-slate-500 text-sm mt-1">Maximum file size: 50 MB</p>
        </div>
      )}

      {error && (
        <p className="text-red-600 text-sm font-medium mt-3">{error}</p>
      )}
    </div>
  );
}
