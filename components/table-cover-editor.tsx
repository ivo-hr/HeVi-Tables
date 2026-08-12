"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState
} from "react";
import { Image as ImageIcon, Paintbrush } from "lucide-react";

import {
  DrawingCanvas,
  type DrawingCanvasHandle
} from "@/components/drawing-canvas";
import { ImageUploadField } from "@/components/image-upload-field";
import { useLanguage } from "@/components/language-provider";

export type TableCoverEditorHandle = {
  exportCover: () => Promise<File | null>;
};

type TableCoverEditorProps = {
  required?: boolean;
  currentUrl?: string | null;
};

export const TableCoverEditor = forwardRef<
  TableCoverEditorHandle,
  TableCoverEditorProps
>(function TableCoverEditor({ required = false, currentUrl }, forwardedRef) {
  const { t } = useLanguage();
  const drawingRef = useRef<DrawingCanvasHandle>(null);
  const [mode, setMode] = useState<"drawing" | "photo">("drawing");
  const [photo, setPhoto] = useState<File | null>(null);

  useImperativeHandle(
    forwardedRef,
    () => ({
      exportCover: async () => {
        if (mode === "photo") return photo;
        if (!required && !drawingRef.current?.hasDrawing()) return null;
        const blob = await drawingRef.current?.exportPng();
        return blob
          ? new File([blob], "portada-dibujada.png", { type: "image/png" })
          : null;
      }
    }),
    [mode, photo, required]
  );

  return (
    <div className="table-cover-editor">
      <div className="cover-mode-tabs" role="tablist" aria-label={t("Tipo de portada", "Cover type")}>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "drawing"}
          className={mode === "drawing" ? "active" : undefined}
          onClick={() => setMode("drawing")}
        >
          <Paintbrush size={17} />
          {t("Dibujar", "Draw")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "photo"}
          className={mode === "photo" ? "active" : undefined}
          onClick={() => setMode("photo")}
        >
          <ImageIcon size={17} />
          {t("Subir foto", "Upload photo")}
        </button>
      </div>
      {mode === "drawing" ? (
        <div role="tabpanel">
          <DrawingCanvas ref={drawingRef} />
        </div>
      ) : (
        <div role="tabpanel">
          <ImageUploadField
            initialUrl={currentUrl}
            label={t("Elegir foto de portada", "Choose cover photo")}
            editorEyebrow={t("Portada de tabla", "Table cover")}
            editorTitle={t("Encuadra la foto de la tabla", "Frame the table photo")}
            className="table-cover-photo"
            onFileChange={setPhoto}
          />
        </div>
      )}
    </div>
  );
});
