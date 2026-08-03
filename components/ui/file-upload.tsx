"use client";

import { ImagePlus, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useState } from "react";

import { cn } from "@/lib/utils";

export function FileUpload({
  name,
  label,
  hint,
  currentImageUrl,
  removeName,
  className,
}: {
  name: string;
  label: string;
  hint: string;
  currentImageUrl?: string | null;
  removeName?: string;
  className?: string;
}) {
  const id = useId();
  const [preview, setPreview] = useState<string | null>(
    currentImageUrl ?? null,
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const [markedForRemoval, setMarkedForRemoval] = useState(false);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <div className={cn("space-y-2", className)}>
      <span className="text-xs font-extrabold text-[var(--text)]">{label}</span>
      <div className="grid gap-4 rounded-[var(--radius-lg)] border border-dashed border-[color-mix(in_srgb,var(--wine-800)_22%,transparent)] bg-[var(--surface-subtle)] p-4 sm:grid-cols-[7rem_1fr] sm:items-center">
        <div className="relative grid aspect-square place-items-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-white text-[var(--wine-700)]">
          {preview && !markedForRemoval ? (
            <Image
              src={preview}
              alt="Pré-visualização da imagem selecionada"
              fill
              unoptimized
              className="object-contain p-2"
            />
          ) : (
            <ImagePlus className="size-7" aria-hidden="true" />
          )}
        </div>
        <div>
          <input
            id={id}
            className="sr-only"
            type="file"
            name={name}
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
              setPreview(URL.createObjectURL(file));
              setFileName(file.name);
              setMarkedForRemoval(false);
            }}
          />
          <label
            htmlFor={id}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-md)] bg-[var(--wine-800)] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[var(--wine-700)]"
          >
            {preview ? (
              <RefreshCw className="size-4" />
            ) : (
              <UploadCloud className="size-4" />
            )}
            {preview ? "Substituir imagem" : "Selecionar imagem"}
          </label>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            {fileName ?? hint}
          </p>
          {removeName && currentImageUrl && (
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-[var(--danger)]">
              <input
                className="sr-only"
                type="checkbox"
                name={removeName}
                checked={markedForRemoval}
                onChange={(event) => setMarkedForRemoval(event.target.checked)}
              />
              <Trash2 className="size-3.5" />
              {markedForRemoval
                ? "Imagem será removida"
                : "Remover imagem atual"}
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
