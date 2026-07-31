"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent
} from "react";
import { Camera, ImagePlus, SlidersHorizontal, Trash2, X } from "lucide-react";

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

type EditorState = {
  id: string;
  zoom: number;
  x: number;
  y: number;
};

const MAX_FILES = 3;
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_DIMENSION = 512;
const MAX_OUTPUT_BYTES = 1024 * 1024; // 1 MB — compress rather than fail.

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo leer la imagen."));
    image.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/**
 * Compresses a canvas to a Blob that is guaranteed to be ≤ 1 MB.
 * Tries WebP first (best compression), then falls back to JPEG.
 * Reduces quality progressively until the size fits.
 */
async function compressCanvas(canvas: HTMLCanvasElement) {
  const qualities = [0.82, 0.7, 0.55, 0.4, 0.25];

  // Try WebP first — it produces the smallest files.
  for (const quality of qualities) {
    const blob = await canvasToBlob(canvas, "image/webp", quality);
    if (blob && blob.size <= MAX_OUTPUT_BYTES) {
      return { blob, type: "image/webp" as const };
    }
  }

  // Fallback to JPEG if WebP is not supported or still too large.
  for (const quality of [...qualities, 0.15, 0.08]) {
    const blob = await canvasToBlob(canvas, "image/jpeg", quality);
    if (blob && blob.size <= MAX_OUTPUT_BYTES) {
      return { blob, type: "image/jpeg" as const };
    }
  }

  throw new Error("No se pudo comprimir la imagen por debajo de 1 MB.");
}

async function fitImage(source: File) {
  const sourceUrl = URL.createObjectURL(source);
  try {
    const image = await loadImage(sourceUrl);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo preparar el lienzo.");
    // White background so JPEG (no alpha) doesn't look transparent.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const { blob, type } = await compressCanvas(canvas);
    const ext = type === "image/webp" ? "webp" : "jpg";
    const file = new File(
      [blob],
      `${source.name.replace(/\.[^.]+$/, "") || "evidencia"}.${ext}`,
      { type }
    );
    return {
      id: crypto.randomUUID(),
      source,
      sourceUrl,
      file,
      previewUrl: URL.createObjectURL(blob),
      width: image.naturalWidth,
      height: image.naturalHeight
    } satisfies PreparedEvidence;
  } catch (error) {
    URL.revokeObjectURL(sourceUrl);
    throw error;
  }
}

function CropEditor({
  item,
  state,
  onStateChange,
  onCancel,
  onConfirm
}: {
  item: PreparedEvidence;
  state: EditorState;
  onStateChange: (state: EditorState) => void;
  onCancel: () => void;
  onConfirm: (file: File, previewUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    void loadImage(item.sourceUrl).then((image) => {
      if (cancelled || !canvasRef.current) return;
      const cropSide = Math.min(image.naturalWidth, image.naturalHeight) / state.zoom;
      const sourceX = ((image.naturalWidth - cropSide) * state.x) / 100;
      const sourceY = ((image.naturalHeight - cropSide) * state.y) / 100;
      const canvas = canvasRef.current;
      canvas.width = MAX_DIMENSION;
      canvas.height = MAX_DIMENSION;
      const context = canvas.getContext("2d");
      if (!context) return;
      // White background so JPEG fallback (no alpha) doesn't produce black areas.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, MAX_DIMENSION, MAX_DIMENSION);
      context.drawImage(
        image,
        sourceX,
        sourceY,
        cropSide,
        cropSide,
        0,
        0,
        MAX_DIMENSION,
        MAX_DIMENSION
      );
    });
    return () => {
      cancelled = true;
    };
  }, [item.sourceUrl, state]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onCancel]);

  return (
    <div className="evidence-modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="evidence-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="crop-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="eyebrow">Evidencia</span>
            <h3 id="crop-title">Recorta sin dejar coartadas fuera</h3>
          </div>
          <button type="button" className="icon-button" onClick={onCancel} aria-label="Cerrar">
            <X size={19} />
          </button>
        </header>
        <canvas ref={canvasRef} className="evidence-crop-canvas" />
        <div className="crop-controls">
          <label>
            <span>Escala</span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={state.zoom}
              onChange={(event) =>
                onStateChange({ ...state, zoom: Number(event.target.value) })
              }
            />
          </label>
          <label>
            <span>Horizontal</span>
            <input
              type="range"
              min="0"
              max="100"
              value={state.x}
              onChange={(event) =>
                onStateChange({ ...state, x: Number(event.target.value) })
              }
            />
          </label>
          <label>
            <span>Vertical</span>
            <input
              type="range"
              min="0"
              max="100"
              value={state.y}
              onChange={(event) =>
                onStateChange({ ...state, y: Number(event.target.value) })
              }
            />
          </label>
        </div>
        <div className="evidence-modal-actions">
          <button type="button" className="ghost-button" onClick={onCancel}>Cancelar</button>
          <button
            type="button"
            className="primary-button"
            onClick={async () => {
              if (!canvasRef.current) return;
              const { blob, type } = await compressCanvas(canvasRef.current);
              const ext = type === "image/webp" ? "webp" : "jpg";
              const name = item.file.name.replace(/\.[^.]+$/, `.${ext}`);
              onConfirm(
                new File([blob], name, { type }),
                URL.createObjectURL(blob)
              );
            }}
          >
            Usar este recorte
          </button>
        </div>
      </section>
    </div>
  );
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [retained, setRetained] = useState(existing);
  const [prepared, setPrepared] = useState<PreparedEvidence[]>([]);
  const preparedRef = useRef<PreparedEvidence[]>([]);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const existingKey = existing.map((item) => `${item.path}:${item.url}`).join("|");

  useEffect(() => {
    setRetained(existing);
  }, [existingKey]);

  useEffect(() => {
    setPrepared((current) => {
      current.forEach((item) => {
        URL.revokeObjectURL(item.sourceUrl);
        URL.revokeObjectURL(item.previewUrl);
      });
      return [];
    });
    onFilesChange([]);
    setEditor(null);
    setError(null);
  }, [resetKey]);

  useEffect(() => {
    preparedRef.current = prepared;
  }, [prepared]);

  useEffect(() => {
    return () => {
      preparedRef.current.forEach((item) => {
        URL.revokeObjectURL(item.sourceUrl);
        URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  const updatePrepared = (next: PreparedEvidence[]) => {
    setPrepared(next);
    onFilesChange(next.map((item) => item.file));
  };
  const total = retained.length + prepared.length;
  const editingItem = editor ? prepared.find((item) => item.id === editor.id) : null;

  const addFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const candidates = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!candidates.length) return;
    if (total + candidates.length > MAX_FILES) {
      setError("Máximo 3 imágenes por registro.");
      return;
    }
    if (candidates.some((file) => !file.type.startsWith("image/"))) {
      setError("Elige archivos de imagen.");
      return;
    }
    if (candidates.some((file) => file.size > MAX_SOURCE_BYTES)) {
      setError("Cada imagen original puede ocupar como máximo 10 MB.");
      return;
    }
    try {
      const next = await Promise.all(candidates.map(fitImage));
      updatePrepared([...prepared, ...next]);
      setError(null);
      const firstLarge = next.find(
        (item) => item.width > MAX_DIMENSION || item.height > MAX_DIMENSION
      );
      if (firstLarge) {
        setEditor({ id: firstLarge.id, zoom: 1, x: 50, y: 50 });
      }
    } catch {
      setError("No se pudo preparar una de las imágenes.");
    }
  };

  return (
    <fieldset className="evidence-picker">
      <legend>Evidencias</legend>
      <p>Hasta 3 fotos. Se comprimen automáticamente y nunca superan 512 × 512 px ni 1 MB.</p>
      {retained.map((item) => (
        <input key={item.path} type="hidden" name="existing_evidence_paths" value={item.path} />
      ))}
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept="image/*"
        multiple
        onChange={addFiles}
      />
      <div className="evidence-grid">
        {retained.map((item, index) => (
          <figure className="evidence-thumb" key={item.path}>
            {/* Private signed URLs and local blob URLs are intentionally unoptimized. */}
            <img src={item.url} alt={`Evidencia ${index + 1}`} />
            <button
              type="button"
              onClick={() => setRetained((current) => current.filter((entry) => entry.path !== item.path))}
              aria-label={`Quitar evidencia ${index + 1}`}
            >
              <Trash2 size={15} />
            </button>
          </figure>
        ))}
        {prepared.map((item, index) => (
          <figure className="evidence-thumb" key={item.id}>
            <img src={item.previewUrl} alt={`Nueva evidencia ${retained.length + index + 1}`} />
            <div>
              <button
                type="button"
                onClick={() => setEditor({ id: item.id, zoom: 1, x: 50, y: 50 })}
                aria-label="Recortar o escalar evidencia"
              >
                <SlidersHorizontal size={15} />
              </button>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(item.sourceUrl);
                  URL.revokeObjectURL(item.previewUrl);
                  updatePrepared(prepared.filter((entry) => entry.id !== item.id));
                }}
                aria-label="Quitar evidencia"
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
            <span>{total ? "Otra foto" : "Añadir foto"}</span>
            <small>{total}/3</small>
          </button>
        ) : null}
      </div>
      {error ? <small className="field-error">{error}</small> : null}
      {editingItem && editor ? (
        <CropEditor
          item={editingItem}
          state={editor}
          onStateChange={setEditor}
          onCancel={() => setEditor(null)}
          onConfirm={(file, previewUrl) => {
            URL.revokeObjectURL(editingItem.previewUrl);
            updatePrepared(
              prepared.map((item) =>
                item.id === editingItem.id ? { ...item, file, previewUrl } : item
              )
            );
            setEditor(null);
          }}
        />
      ) : null}
    </fieldset>
  );
}
