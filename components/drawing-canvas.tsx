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

type Point = { x: number; y: number };
type Stroke = { color: string; points: Point[] };

export type DrawingCanvasHandle = {
  exportPng: () => Promise<Blob>;
};

const colors = ["#14a074", "#f4b740", "#ef6a68", "#4b7bec"];

export const DrawingCanvas = forwardRef<DrawingCanvasHandle>(
  function DrawingCanvas(_props, forwardedRef) {
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
        const points = stroke.points.map((point) => ({
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
        for (let index = 1; index < points.length - 1; index += 1) {
          const current = points[index];
          const next = points[index + 1];
          const midpoint = {
            x: (current.x + next.x) / 2,
            y: (current.y + next.y) / 2
          };
          context.quadraticCurveTo(
            current.x,
            current.y,
            midpoint.x,
            midpoint.y
          );
        }
        const last = points.at(-1);
        if (last) context.lineTo(last.x, last.y);
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
      strokesRef.current.push(activeStrokeRef.current);
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
        exportPng: () =>
          new Promise<Blob>((resolve, reject) => {
            redraw();
            canvasRef.current?.toBlob((blob) => {
              if (blob) resolve(blob);
              else reject(new Error("No se pudo exportar el dibujo."));
            }, "image/png");
          })
      }),
      [redraw]
    );

    return (
      <div className="drawing-module">
        <div className="canvas-wrap">
          <canvas
            ref={canvasRef}
            aria-label="Lienzo para dibujar la portada"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              activeStrokeRef.current = { color, points: [getPoint(event)] };
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
              Dibuja algo aquí
              <small>con el dedo o el ratón</small>
            </span>
          ) : null}
        </div>
        <div className="canvas-toolbar">
          <div className="color-palette" aria-label="Colores del pincel">
            {colors.map((item) => (
              <button
                type="button"
                key={item}
                className={item === color ? "color active" : "color"}
                style={{ backgroundColor: item }}
                onClick={() => setColor(item)}
                aria-label={`Usar color ${item}`}
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
              Deshacer
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
              Limpiar
            </button>
          </div>
        </div>
      </div>
    );
  }
);
