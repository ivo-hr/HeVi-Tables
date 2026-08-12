"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from "react";
import { RotateCcw, Undo2 } from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import {
  smoothStrokePoints,
  type DrawingPoint as Point
} from "@/lib/drawing";

type Stroke = { color: string; points: Point[]; finalized: boolean };

export type DrawingCanvasHandle = {
  exportPng: () => Promise<Blob>;
  hasDrawing: () => boolean;
};

const colors = ["#14a074", "#f4b740", "#ef6a68", "#4b7bec"];

export const DrawingCanvas = forwardRef<DrawingCanvasHandle>(
  function DrawingCanvas(_props, forwardedRef) {
    const { t } = useLanguage();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const strokesRef = useRef<Stroke[]>([]);
    const activeStrokeRef = useRef<Stroke | null>(null);
    const [color, setColor] = useState(colors[0]);
    const [strokeCount, setStrokeCount] = useState(0);

    const drawStroke = useCallback(
      (
        context: CanvasRenderingContext2D,
        stroke: Stroke,
        width: number,
        height: number
      ) => {
        const sourcePoints = stroke.finalized
          ? stroke.points
          : smoothStrokePoints(stroke.points);
        const points = sourcePoints.map((point) => ({
          x: point.x * width,
          y: point.y * height
        }));
        if (points.length === 0) return;

        context.strokeStyle = stroke.color;
        context.fillStyle = stroke.color;
        context.lineWidth = Math.max(4, Math.min(width, height) * 0.014);
        context.lineCap = "round";
        context.lineJoin = "round";

        if (points.length === 1) {
          context.beginPath();
          context.arc(points[0].x, points[0].y, context.lineWidth / 2, 0, Math.PI * 2);
          context.fill();
          return;
        }

        context.beginPath();
        context.moveTo(points[0].x, points[0].y);
        for (let index = 0; index < points.length - 1; index += 1) {
          const previous = points[index - 1] ?? points[index];
          const current = points[index];
          const next = points[index + 1];
          const following = points[index + 2] ?? next;
          context.bezierCurveTo(
            current.x + (next.x - previous.x) / 6,
            current.y + (next.y - previous.y) / 6,
            next.x - (following.x - current.x) / 6,
            next.y - (following.y - current.y) / 6,
            next.x,
            next.y
          );
        }
        context.stroke();
      },
      []
    );

    const redraw = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const nextWidth = Math.round(bounds.width * ratio);
      const nextHeight = Math.round(bounds.height * ratio);
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }

      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.fillStyle = "#fffaf2";
      context.fillRect(0, 0, bounds.width, bounds.height);

      strokesRef.current.forEach((stroke) =>
        drawStroke(context, stroke, bounds.width, bounds.height)
      );
      if (activeStrokeRef.current) {
        drawStroke(
          context,
          activeStrokeRef.current,
          bounds.width,
          bounds.height
        );
      }
    }, [drawStroke]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const observer = new ResizeObserver(redraw);
      observer.observe(canvas);
      redraw();
      return () => observer.disconnect();
    }, [redraw]);

    const getPoint = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
      const bounds = event.currentTarget.getBoundingClientRect();
      return {
        x: Math.min(Math.max((event.clientX - bounds.left) / bounds.width, 0), 1),
        y: Math.min(Math.max((event.clientY - bounds.top) / bounds.height, 0), 1)
      };
    };

    const finishStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!activeStrokeRef.current) return;
      strokesRef.current.push({
        ...activeStrokeRef.current,
        points: smoothStrokePoints(activeStrokeRef.current.points),
        finalized: true
      });
      activeStrokeRef.current = null;
      setStrokeCount(strokesRef.current.length);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      redraw();
    };

    useImperativeHandle(
      forwardedRef,
      () => ({
        hasDrawing: () =>
          strokesRef.current.length > 0 || activeStrokeRef.current !== null,
        exportPng: () =>
          new Promise<Blob>((resolve, reject) => {
            redraw();
            const source = canvasRef.current;
            if (!source) {
              reject(new Error(t("No se pudo exportar el dibujo.", "The drawing could not be exported.")));
              return;
            }

            // Every stored image in the app shares the same 512 px ceiling.
            const MAX_EXPORT_DIMENSION = 512;
            const longest = Math.max(source.width, source.height);
            const scale =
              longest > MAX_EXPORT_DIMENSION
                ? MAX_EXPORT_DIMENSION / longest
                : 1;
            const targetWidth = Math.max(1, Math.round(source.width * scale));
            const targetHeight = Math.max(1, Math.round(source.height * scale));

            const exportCanvas = document.createElement("canvas");
            exportCanvas.width = targetWidth;
            exportCanvas.height = targetHeight;
            const context = exportCanvas.getContext("2d");
            if (!context) {
              reject(new Error(t("No se pudo exportar el dibujo.", "The drawing could not be exported.")));
              return;
            }
            context.drawImage(source, 0, 0, targetWidth, targetHeight);
            exportCanvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else reject(new Error(t("No se pudo exportar el dibujo.", "The drawing could not be exported.")));
            }, "image/png");
          })
      }),
      [redraw, t]
    );

    return (
      <div className="drawing-module">
        <div className="canvas-wrap">
          <canvas
            ref={canvasRef}
            aria-label={t("Lienzo para dibujar la portada", "Canvas for drawing the cover")}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              activeStrokeRef.current = {
                color,
                points: [getPoint(event)],
                finalized: false
              };
              redraw();
            }}
            onPointerMove={(event) => {
              if (!activeStrokeRef.current) return;
              activeStrokeRef.current.points.push(getPoint(event));
              redraw();
            }}
            onPointerUp={finishStroke}
            onPointerCancel={finishStroke}
          />
          {strokeCount === 0 ? (
            <span className="canvas-hint" aria-hidden="true">
              {t("Dibuja algo aquí", "Draw something here")}
              <small>{t("con el dedo o el ratón", "with your finger or mouse")}</small>
            </span>
          ) : null}
        </div>
        <div className="canvas-toolbar">
          <div className="color-palette" aria-label={t("Colores del pincel", "Brush colours")}>
            {colors.map((item) => (
              <button
                type="button"
                key={item}
                className={item === color ? "color active" : "color"}
                style={{ backgroundColor: item }}
                onClick={() => setColor(item)}
                aria-label={`${t("Usar color", "Use colour")} ${item}`}
                aria-pressed={item === color}
              />
            ))}
          </div>
          <div className="canvas-actions">
            <button
              type="button"
              className="tool-button"
              disabled={strokeCount === 0}
              onClick={() => {
                strokesRef.current.pop();
                setStrokeCount(strokesRef.current.length);
                redraw();
              }}
            >
              <Undo2 size={17} />
              {t("Deshacer", "Undo")}
            </button>
            <button
              type="button"
              className="tool-button"
              disabled={strokeCount === 0}
              onClick={() => {
                strokesRef.current = [];
                setStrokeCount(0);
                redraw();
              }}
            >
              <RotateCcw size={17} />
              {t("Limpiar", "Clear")}
            </button>
          </div>
        </div>
      </div>
    );
  }
);
