"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Camera, ImagePlus, SlidersHorizontal, Trash2 } from "lucide-react";

import {
  createDefaultCroppedImage,
  ImageCropEditor,
  type ProcessedClientImage
} from "@/components/image-crop-editor";
import { useLanguage } from "@/components/language-provider";
import {
  isAcceptedImageType
} from "@/lib/image-constraints";

export type EvidencePreview = {
  path: string;
  url: string;
};

type PreparedEvidence = {
  id: string;
  source: File;
  sourceUrl: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
};

const MAX_FILES = 3;

async function prepareEvidence(source: File): Promise<PreparedEvidence> {
  const result = await createDefaultCroppedImage(source);
  return {
    id: crypto.randomUUID(),
    source,
    sourceUrl: URL.createObjectURL(source),
    file: result.file,
    previewUrl: URL.createObjectURL(result.file),
    width: result.width,
    height: result.height
  };
}

function releaseEvidence(item: PreparedEvidence) {
  URL.revokeObjectURL(item.sourceUrl);
  URL.revokeObjectURL(item.previewUrl);
}

export function EvidencePicker({
  existing = [],
  onFilesChange,
  resetKey = 0
}: {
  existing?: EvidencePreview[];
  onFilesChange: (files: File[]) => void;
  resetKey?: number;
}) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [retained, setRetained] = useState(existing);
  const [prepared, setPrepared] = useState<PreparedEvidence[]>([]);
  const preparedRef = useRef<PreparedEvidence[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const existingKey = existing.map((item) => `${item.path}:${item.url}`).join("|");

  useEffect(() => {
    setRetained(existing);
  }, [existingKey]);

  useEffect(() => {
    setPrepared((current) => {
      current.forEach(releaseEvidence);
      return [];
    });
    onFilesChange([]);
    setEditingId(null);
    setError(null);
  }, [resetKey]);

  useEffect(() => {
    preparedRef.current = prepared;
  }, [prepared]);

  useEffect(() => {
    return () => preparedRef.current.forEach(releaseEvidence);
  }, []);

  const updatePrepared = (next: PreparedEvidence[]) => {
    setPrepared(next);
    onFilesChange(next.map((item) => item.file));
  };
  const total = retained.length + prepared.length;
  const editingItem = prepared.find((item) => item.id === editingId) ?? null;

  const addFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const candidates = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!candidates.length) return;
    if (total + candidates.length > MAX_FILES) {
      setError(t("Máximo 3 imágenes por registro.", "Maximum 3 images per entry."));
      return;
    }
    if (candidates.some((file) => !isAcceptedImageType(file.type))) {
      setError(t("Elige fotos válidas.", "Choose valid photos."));
      return;
    }
    const next: PreparedEvidence[] = [];
    try {
      for (const candidate of candidates) {
        next.push(await prepareEvidence(candidate));
      }
      updatePrepared([...prepared, ...next]);
      setEditingId(next[0]?.id ?? null);
      setError(null);
    } catch {
      next.forEach(releaseEvidence);
      setError(t("No se pudo preparar una de las imágenes.", "One of the images could not be prepared."));
    }
  };

  const applyEdit = (item: PreparedEvidence, result: ProcessedClientImage) => {
    URL.revokeObjectURL(item.previewUrl);
    const previewUrl = URL.createObjectURL(result.file);
    updatePrepared(
      prepared.map((entry) =>
        entry.id === item.id
          ? {
              ...entry,
              file: result.file,
              previewUrl,
              width: result.width,
              height: result.height
            }
          : entry
      )
    );
    setEditingId(null);
  };

  return (
    <fieldset className="evidence-picker">
      <legend>{t("Evidencias", "Evidence")}</legend>
      <p>{t("Hasta 3 fotos. Puedes encuadrarlas antes de guardarlas.", "Up to 3 photos. You can frame them before saving.")}</p>
      {retained.map((item) => (
        <input key={item.path} type="hidden" name="existing_evidence_paths" value={item.path} />
      ))}
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={addFiles}
      />
      <div className="evidence-grid">
        {retained.map((item, index) => (
          <figure className="evidence-thumb" key={item.path}>
            {/* Private signed URLs are intentionally unoptimized. */}
            <img src={item.url} alt={`${t("Evidencia", "Evidence")} ${index + 1}`} />
            <button
              type="button"
              onClick={() =>
                setRetained((current) =>
                  current.filter((entry) => entry.path !== item.path)
                )
              }
              aria-label={`${t("Quitar evidencia", "Remove evidence")} ${index + 1}`}
            >
              <Trash2 size={15} />
            </button>
          </figure>
        ))}
        {prepared.map((item, index) => (
          <figure className="evidence-thumb" key={item.id}>
            <img src={item.previewUrl} alt={`${t("Nueva evidencia", "New evidence")} ${retained.length + index + 1}`} />
            <div>
              <button
                type="button"
                onClick={() => setEditingId(item.id)}
                aria-label={t("Recortar o escalar evidencia", "Crop or scale evidence")}
              >
                <SlidersHorizontal size={15} />
              </button>
              <button
                type="button"
                onClick={() => {
                  releaseEvidence(item);
                  updatePrepared(prepared.filter((entry) => entry.id !== item.id));
                }}
                aria-label={t("Quitar evidencia", "Remove evidence")}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </figure>
        ))}
        {total < MAX_FILES ? (
          <button
            type="button"
            className="evidence-add"
            onClick={() => inputRef.current?.click()}
          >
            {total ? <ImagePlus size={22} /> : <Camera size={22} />}
            <span>{total ? t("Otra foto", "Another photo") : t("Añadir foto", "Add photo")}</span>
            <small>{total}/3</small>
          </button>
        ) : null}
      </div>
      {error ? <small className="field-error">{error}</small> : null}
      {editingItem ? (
        <ImageCropEditor
          source={editingItem.source}
          eyebrow={t("Evidencia", "Evidence")}
          title={t("Encuadra lo que demuestra la jugada", "Frame what proves the point")}
          onCancel={() => setEditingId(null)}
          onConfirm={(result) => applyEdit(editingItem, result)}
        />
      ) : null}
    </fieldset>
  );
}
