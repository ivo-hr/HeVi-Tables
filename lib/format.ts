export function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function formatPoints(value: number) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2
  }).format(value);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function pointSystemLabel(pointSystem: PointSystem) {
  return {
    WtA: "Winner takes all",
    Pod: "Podio",
    EC: "Todo cuenta"
  }[pointSystem];
}
import type { PointSystem } from "@/lib/types";
