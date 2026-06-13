import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Loader2, ImageIcon, AlertCircle } from "lucide-react";
import { useUploadFilesMutation } from "../../app/api";

interface ImageUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxFiles?: number;
  label?: string;
}

export function ImageUploader({
  value,
  onChange,
  maxFiles = 8,
  label = "Product images",
}: ImageUploaderProps) {
  const [uploadFiles, { isLoading }] = useUploadFilesMutation();
  const [error, setError] = useState("");

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setError("");
      const remaining = maxFiles - value.length;
      if (remaining <= 0) {
        setError(`Maximum ${maxFiles} images allowed.`);
        return;
      }
      const filesToUpload = acceptedFiles.slice(0, remaining);
      const formData = new FormData();
      filesToUpload.forEach((f) => formData.append("files", f));

      try {
        const result = await uploadFiles(formData).unwrap();
        onChange([...value, ...result.urls]);
      } catch (err: unknown) {
        const e = err as { data?: { error?: string }; error?: string };
        const msg =
          e?.data?.error ?? e?.error ?? "Upload failed. Check your connection and try again.";
        setError(msg);
      }
    },
    [value, onChange, maxFiles, uploadFiles],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxSize: 8 * 1024 * 1024, // 8MB
    disabled: isLoading || value.length >= maxFiles,
  });

  function removeImage(index: number) {
    const next = value.filter((_, i) => i !== index);
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-forest">
        {label}
        <span className="text-slate/40 font-normal ml-1">
          ({value.length}/{maxFiles})
        </span>
      </p>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all select-none
          ${isDragActive ? "border-saffron bg-saffron/5" : "border-forest/20 hover:border-saffron/60 hover:bg-forest/2"}
          ${isLoading ? "pointer-events-none opacity-60" : ""}
          ${value.length >= maxFiles ? "pointer-events-none opacity-40" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          {isLoading ? (
            <Loader2 className="animate-spin text-saffron" size={28} />
          ) : (
            <Upload className="text-forest/40" size={28} />
          )}
          <p className="text-sm text-slate/70">
            {isDragActive
              ? "Drop images here…"
              : isLoading
                ? "Uploading…"
                : value.length >= maxFiles
                  ? "Maximum images reached"
                  : "Drag & drop images, or click to browse"}
          </p>
          <p className="text-xs text-slate/40">JPG, PNG, WebP · max 8 MB each</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-vermillion text-sm bg-vermillion/5 rounded-lg px-3 py-2">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Preview grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {value.map((url, i) => (
            <div key={url} className="relative group aspect-square">
              <img
                src={url}
                alt={`Image ${i + 1}`}
                className="w-full h-full object-cover rounded-lg border border-forest/10"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "";
                  (e.target as HTMLImageElement).parentElement!.classList.add("bg-slate/10");
                }}
              />
              {/* Broken URL fallback */}
              <div className="absolute inset-0 hidden items-center justify-center rounded-lg bg-slate/10">
                <ImageIcon size={20} className="text-slate/30" />
              </div>
              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 bg-vermillion text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                aria-label="Remove image"
              >
                <X size={12} />
              </button>
              {i === 0 && (
                <span className="absolute bottom-1 left-1 text-xs bg-forest text-saffron px-1.5 py-0.5 rounded font-medium">
                  Cover
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
