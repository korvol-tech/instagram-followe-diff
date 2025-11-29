"use client";

import { useCallback } from "react";

interface FileUploadProps {
  label: string;
  accept?: string;
  onFileSelect: (file: File) => void;
  fileName?: string;
}

export function FileUpload({
  label,
  accept = ".json",
  onFileSelect,
  fileName,
}: FileUploadProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <div className="relative">
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          data-testid={`file-input-${label.toLowerCase().replace(/\s+/g, "-")}`}
        />
        <div className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {fileName || "Click to select file"}
          </span>
        </div>
      </div>
    </div>
  );
}
