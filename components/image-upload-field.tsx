"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Camera, ImagePlus, SlidersHorizontal, Trash2 } from "lucide-react";

import {
  ImageCropEditor,
  type ProcessedClientImage
} from "@/components/image-crop-editor";
import { useLanguage } from "@/components/language-provider";
import {
  imageConstraintDescription,
  isAcceptedImageType
} from "@/lib/image-constraints";

type ImageUploadFieldProps = {
  initialUrl?: string | null;
  placeholder?: ReactNode;
  label: string;
  editorEyebrow: string;
  editorTitle: string;
  className?: string;
  onFileChange: (file: File | null) => void;
};

export function ImageUploadField({
  initialUrl,
  placeholder,
  label,
  editorEyebrow,
  editorTitle,
  className = "",
  onFileChange
}: ImageUploadFieldProps) {
  const { locale, t } = useLanguage();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const generatedPreviewRef = useRef<string | null>(null);
  const [source, setSource] = useState<File | null>(null);
  const [processed, setProcessed] = useState<ProcessedClientImage | null>(null);
  const [previewUrl, setPreviewUrl] = useState(initialUrl ?? null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (generatedPreviewRef.current) {
        URL.revokeObjectURL(generatedPreviewRef.current);
      }
    };
  }, []);

  const chooseFile = (file: File | undefined) => {
    if (!file) return;
    if (!isAcceptedImageType(file.type)) {
      setError(t("Elige una foto válida.", "Choose a valid photo."));
      return;
    }
    setSource(file);
    setEditing(true);
    setError(null);
  };

  const applyImage = (result: ProcessedClientImage) => {
    if (generatedPreviewRef.current) {
      URL.revokeObjectURL(generatedPreviewRef.current);
    }
    const nextPreview = URL.createObjectURL(result.file);
    generatedPreviewRef.current = nextPreview;
    setProcessed(result);
    setPreviewUrl(nextPreview);
    setEditing(false);
    setError(null);
    onFileChange(result.file);
  };

  const discardNewImage = () => {
    if (generatedPreviewRef.current) {
      URL.revokeObjectURL(generatedPreviewRef.current);
      generatedPreviewRef.current = null;
    }
    setSource(null);
    setProcessed(null);
    setPreviewUrl(initialUrl ?? null);
    setError(null);
    onFileChange(null);
  };

  return (
    <div className={`image-upload-field ${className}`.trim()}>
      <input
        ref={inputRef}
        id={inputId}
        className="visually-hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => {
          chooseFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <div className="image-upload-preview">
        {previewUrl ? (
          // Public Storage URLs and local blob URLs are intentionally unoptimized.
          <img src={previewUrl} alt={t("Vista previa del recorte", "Crop preview")} />
        ) : (
          <span className="image-upload-placeholder">
            {placeholder ?? <ImagePlus size={28} />}
          </span>
        )}
      </div>
      <div className="image-upload-actions">
        <button type="button" className="secondary-button" onClick={() => inputRef.current?.click()}>
          <Camera size={16} />
          {previewUrl ? t("Elegir otra", "Choose another") : label}
        </button>
        {source ? (
          <button type="button" className="ghost-button" onClick={() => setEditing(true)}>
            <SlidersHorizontal size={16} />
            {t("Ajustar", "Adjust")}
          </button>
        ) : null}
        {processed ? (
          <button
            type="button"
            className="image-upload-discard"
            onClick={discardNewImage}
            aria-label={t("Descartar la imagen nueva", "Discard the new image")}
          >
            <Trash2 size={15} />
          </button>
        ) : null}
      </div>
      <small className="image-upload-help">
        {processed
          ? t("Lista para usar.", "Ready to use.")
          : imageConstraintDescription(locale)}
      </small>
      {error ? <small className="field-error">{error}</small> : null}
      {source && editing ? (
        <ImageCropEditor
          source={source}
          eyebrow={editorEyebrow}
          title={editorTitle}
          onCancel={() => setEditing(false)}
          onConfirm={applyImage}
        />
      ) : null}
    </div>
  );
}
