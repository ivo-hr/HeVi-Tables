"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent
} from "react";
import { Crop, LoaderCircle, Move, RotateCcw, X } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import {
  MAX_IMAGE_DIMENSION,
  MAX_IMAGE_OUTPUT_BYTES
} from "@/lib/image-constraints";

type ImageSize = { width: number; height: number };
type EditorState = { centerX: number; centerY: number; zoom: number };
type CropRect = { x: number; y: number; width: number; height: number };

export type ProcessedClientImage = {
  file: File;
  width: number;
  height: number;
};

type ImageCropEditorProps = {
  source: File;
  eyebrow?: string;
  title?: string;
  onCancel: () => void;
  onConfirm: (result: ProcessedClientImage) => void;
};

const INITIAL_STATE: EditorState = { centerX: 0.5, centerY: 0.5, zoom: 1 };
const CROP_ASPECT_RATIO = 1;
const MIN_CROP_PIXELS = 72;

function loadBrowserImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo leer la imagen."));
    image.src = url;
  });
}

function initialCropSize(size: ImageSize) {
  const imageRatio = size.width / size.height;
  return imageRatio >= CROP_ASPECT_RATIO
    ? { width: CROP_ASPECT_RATIO / imageRatio, height: 1 }
    : { width: 1, height: imageRatio / CROP_ASPECT_RATIO };
}

function cropRectFor(
  size: ImageSize,
  state: EditorState
): CropRect {
  const base = initialCropSize(size);
  const width = base.width / state.zoom;
  const height = base.height / state.zoom;
  const centerX = Math.min(Math.max(state.centerX, width / 2), 1 - width / 2);
  const centerY = Math.min(Math.max(state.centerY, height / 2), 1 - height / 2);
  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height
  };
}

function outputSizeFor(size: ImageSize, crop: CropRect) {
  const sourceWidth = Math.max(1, Math.round(size.width * crop.width));
  const sourceHeight = Math.max(1, Math.round(size.height * crop.height));
  const side = Math.min(sourceWidth, sourceHeight, MAX_IMAGE_DIMENSION);
  return { width: side, height: side };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

async function compressCanvas(canvas: HTMLCanvasElement) {
  const qualities = [0.84, 0.76, 0.66, 0.54, 0.42, 0.3];
  for (const quality of qualities) {
    const blob = await canvasToBlob(canvas, "image/webp", quality);
    if (blob && blob.size <= MAX_IMAGE_OUTPUT_BYTES) {
      return { blob, type: "image/webp" as const, extension: "webp" as const };
    }
  }
  for (const quality of [...qualities, 0.2, 0.12]) {
    const blob = await canvasToBlob(canvas, "image/jpeg", quality);
    if (blob && blob.size <= MAX_IMAGE_OUTPUT_BYTES) {
      return { blob, type: "image/jpeg" as const, extension: "jpg" as const };
    }
  }
  throw new Error("No pudimos preparar la foto. Prueba con otra.");
}

async function renderCrop(
  sourceUrl: string,
  sourceName: string,
  size: ImageSize,
  crop: CropRect,
  rotation = 0
): Promise<ProcessedClientImage> {
  const image = await loadBrowserImage(sourceUrl);
  const output = outputSizeFor(size, crop);
  const canvas = document.createElement("canvas");
  canvas.width = output.width;
  canvas.height = output.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo preparar el lienzo de recorte.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, output.width, output.height);
  const sourceWidth = crop.width * size.width;
  const sourceHeight = crop.height * size.height;
  const sourceSide = Math.min(sourceWidth, sourceHeight);
  const sourceX = crop.x * size.width + (sourceWidth - sourceSide) / 2;
  const sourceY = crop.y * size.height + (sourceHeight - sourceSide) / 2;
  const scale = output.width / sourceSide;
  context.setTransform(scale, 0, 0, scale, -sourceX * scale, -sourceY * scale);
  if (rotation === 90) {
    context.translate(image.naturalHeight, 0);
    context.rotate(Math.PI / 2);
  } else if (rotation === 180) {
    context.translate(image.naturalWidth, image.naturalHeight);
    context.rotate(Math.PI);
  } else if (rotation === 270) {
    context.translate(0, image.naturalWidth);
    context.rotate(-Math.PI / 2);
  }
  context.drawImage(image, 0, 0);
  context.resetTransform();
  const encoded = await compressCanvas(canvas);
  const stem = sourceName.replace(/\.[^.]+$/, "") || "imagen";
  return {
    file: new File([encoded.blob], `${stem}.${encoded.extension}`, {
      type: encoded.type
    }),
    ...output
  };
}

export async function createDefaultCroppedImage(
  source: File
) {
  const sourceUrl = URL.createObjectURL(source);
  try {
    const image = await loadBrowserImage(sourceUrl);
    const size = { width: image.naturalWidth, height: image.naturalHeight };
    return await renderCrop(
      sourceUrl,
      source.name,
      size,
      cropRectFor(size, INITIAL_STATE)
    );
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export function ImageCropEditor({
  source,
  eyebrow,
  title,
  onCancel,
  onConfirm
}: ImageCropEditorProps) {
  const { t } = useLanguage();
  const displayEyebrow = eyebrow ?? t("Editor de imagen", "Image editor");
  const displayTitle = title ?? t("Elige el recorte", "Choose the crop");
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: "move" | "resize";
    corner?: "nw" | "ne" | "sw" | "se";
    pointerId: number;
    clientX: number;
    clientY: number;
    centerX: number;
    centerY: number;
    zoom: number;
    crop: CropRect;
  } | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [size, setSize] = useState<ImageSize | null>(null);
  const [rotation, setRotation] = useState(0);
  const [state, setState] = useState(INITIAL_STATE);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const nextSourceUrl = URL.createObjectURL(source);
    setSourceUrl(nextSourceUrl);
    setSize(null);
    setState(INITIAL_STATE);
    setRotation(0);
    void loadBrowserImage(nextSourceUrl)
      .then((image) => {
        if (!cancelled) {
          setSize({ width: image.naturalWidth, height: image.naturalHeight });
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError(t("No se pudo abrir esta imagen.", "This image could not be opened."));
      });
    return () => {
      cancelled = true;
      URL.revokeObjectURL(nextSourceUrl);
    };
  }, [source, t]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onCancel]);

  const rotatedSize = size
    ? rotation % 180 === 0
      ? size
      : { width: size.height, height: size.width }
    : null;
  const crop = rotatedSize ? cropRectFor(rotatedSize, state) : null;
  const imageRatio = rotatedSize ? rotatedSize.width / rotatedSize.height : 1;
  const stageStyle = {
    "--source-ratio": String(imageRatio),
    "--stage-width": `${52 * imageRatio}vh`
  } as CSSProperties;

  const manipulateCrop = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const bounds = stageRef.current?.getBoundingClientRect();
    if (!drag || !bounds || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.clientX;
    const deltaY = event.clientY - drag.clientY;

    if (drag.mode === "move") {
      const nextCenterX = drag.centerX + deltaX / bounds.width;
      const nextCenterY = drag.centerY + deltaY / bounds.height;
      setState({
        zoom: drag.zoom,
        centerX: Math.min(
          Math.max(nextCenterX, drag.crop.width / 2),
          1 - drag.crop.width / 2
        ),
        centerY: Math.min(
          Math.max(nextCenterY, drag.crop.height / 2),
          1 - drag.crop.height / 2
        )
      });
      return;
    }

    const corner = drag.corner ?? "se";
    const horizontalDirection = corner.endsWith("e") ? 1 : -1;
    const verticalDirection = corner.startsWith("s") ? 1 : -1;
    const initialPixels = drag.crop.width * bounds.width;
    const requestedPixels =
      initialPixels +
      (deltaX * horizontalDirection + deltaY * verticalDirection) / 2;
    const base = rotatedSize ? initialCropSize(rotatedSize) : { width: 1, height: 1 };
    const basePixels = base.width * bounds.width;
    const oppositeX = corner.endsWith("e")
      ? drag.crop.x
      : drag.crop.x + drag.crop.width;
    const oppositeY = corner.startsWith("s")
      ? drag.crop.y
      : drag.crop.y + drag.crop.height;
    const horizontalRoom = corner.endsWith("e")
      ? (1 - oppositeX) * bounds.width
      : oppositeX * bounds.width;
    const verticalRoom = corner.startsWith("s")
      ? (1 - oppositeY) * bounds.height
      : oppositeY * bounds.height;
    const nextPixels = Math.min(
      Math.max(requestedPixels, MIN_CROP_PIXELS),
      basePixels,
      horizontalRoom,
      verticalRoom
    );
    const width = nextPixels / bounds.width;
    const height = nextPixels / bounds.height;
    const x = corner.endsWith("e") ? oppositeX : oppositeX - width;
    const y = corner.startsWith("s") ? oppositeY : oppositeY - height;
    setState({
      zoom: base.width / width,
      centerX: x + width / 2,
      centerY: y + height / 2
    });
  };

  return (
    <div className="evidence-modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="evidence-modal image-editor-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-editor-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="eyebrow">{displayEyebrow}</span>
            <h3 id="image-editor-title">{displayTitle}</h3>
          </div>
          <button type="button" className="icon-button" onClick={onCancel} aria-label={t("Cerrar", "Close")}>
            <X size={19} />
          </button>
        </header>

        {sourceUrl && rotatedSize && crop ? (
          <>
            <p className="image-editor-help">
              {t("Arrastra el centro para mover el recorte. Tira de cualquier esquina para cambiar su tamaño.", "Drag the centre to move the crop. Pull any corner to resize it.")}
            </p>
            <div ref={stageRef} className="image-editor-stage" style={stageStyle}>
              {/* Local blob URLs must not go through next/image. */}
              <img
                src={sourceUrl}
                alt={t("Imagen completa para recortar", "Full image to crop")}
                style={{
                  width: rotation % 180 === 0 ? "100%" : `${100 / imageRatio}%`,
                  transform: `translate(-50%, -50%) rotate(${rotation}deg)`
                }}
              />
              <div
                className="image-crop-box"
                style={{
                  left: `${crop.x * 100}%`,
                  top: `${crop.y * 100}%`,
                  width: `${crop.width * 100}%`,
                  height: `${crop.height * 100}%`
                }}
                role="application"
                aria-label={t("Área de recorte arrastrable", "Draggable crop area")}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  const corner = (event.target as HTMLElement).dataset.cropCorner as
                    | "nw"
                    | "ne"
                    | "sw"
                    | "se"
                    | undefined;
                  dragRef.current = {
                    mode: corner ? "resize" : "move",
                    corner,
                    pointerId: event.pointerId,
                    clientX: event.clientX,
                    clientY: event.clientY,
                    centerX: state.centerX,
                    centerY: state.centerY,
                    zoom: state.zoom,
                    crop
                  };
                }}
                onPointerMove={manipulateCrop}
                onPointerUp={(event) => {
                  dragRef.current = null;
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }
                }}
                onPointerCancel={() => {
                  dragRef.current = null;
                }}
              >
                <span className="crop-grid-line crop-grid-v-one" />
                <span className="crop-grid-line crop-grid-v-two" />
                <span className="crop-grid-line crop-grid-h-one" />
                <span className="crop-grid-line crop-grid-h-two" />
                <span className="crop-move-hint"><Move size={16} /></span>
                <span className="crop-resize-handle crop-resize-nw" data-crop-corner="nw" />
                <span className="crop-resize-handle crop-resize-ne" data-crop-corner="ne" />
                <span className="crop-resize-handle crop-resize-sw" data-crop-corner="sw" />
                <span className="crop-resize-handle crop-resize-se" data-crop-corner="se" />
              </div>
            </div>
            <div className="image-editor-meta">
              <span><Crop size={15} /> {t("Encuadre cuadrado", "Square crop")}</span>
              <button
                type="button"
                onClick={() => {
                  setRotation((current) => (current + 270) % 360);
                  setState(INITIAL_STATE);
                }}
              >
                <RotateCcw size={14} /> {t("Girar 90°", "Rotate 90°")}
              </button>
            </div>
          </>
        ) : (
          <div className="image-editor-loading">
            {error ? null : <LoaderCircle className="spin" size={22} />}
            {error ?? t("Preparando la imagen…", "Preparing image…")}
          </div>
        )}

        {error && size ? <p className="form-message error">{error}</p> : null}
        <div className="evidence-modal-actions">
          <button type="button" className="ghost-button" onClick={onCancel} disabled={pending}>
            {t("Cancelar", "Cancel")}
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={!rotatedSize || !crop || pending}
            onClick={async () => {
              if (!sourceUrl || !rotatedSize || !crop) return;
              setPending(true);
              setError(null);
              try {
                onConfirm(
                  await renderCrop(sourceUrl, source.name, rotatedSize, crop, rotation)
                );
              } catch (caught) {
                void caught;
                setError(t("No se pudo guardar el recorte.", "The crop could not be saved."));
                setPending(false);
              }
            }}
          >
            {pending ? <LoaderCircle className="spin" size={17} /> : <Crop size={17} />}
            {pending ? t("Comprimiendo…", "Compressing…") : t("Usar este recorte", "Use this crop")}
          </button>
        </div>
      </section>
    </div>
  );
}
