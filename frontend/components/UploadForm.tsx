"use client";

import { useState, useRef, type DragEvent } from "react";

interface UploadFormProps {
  onFileSelect: (file: File) => void;
}

export default function UploadForm({ onFileSelect }: UploadFormProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") {
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
        dragOver
          ? "border-blue-500 bg-blue-50"
          : "border-gray-300 hover:border-gray-400"
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
      <div className="text-4xl mb-4">
        {selectedFile ? "\u2705" : "\u{1F4C4}"}
      </div>
      {selectedFile ? (
        <div>
          <p className="font-semibold text-lg">{selectedFile.name}</p>
          <p className="text-gray-500 text-sm">
            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      ) : (
        <div>
          <p className="text-lg font-medium">
            Drop a PDF here or click to browse
          </p>
          <p className="text-gray-500 text-sm mt-1">Maximum file size: 50 MB</p>
        </div>
      )}
    </div>
  );
}
