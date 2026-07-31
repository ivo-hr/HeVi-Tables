import type { PointSystem } from "@/lib/types";

export type ScorableRow = {
  id: string;
  position: number | null;
  pointsReceivable: number | null;
};

export type ScoredRow = ScorableRow & {
  pointsWon: number;
};

export class RuleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuleValidationError";
  }
}

export function calculatePoints(
  pointSystem: PointSystem,
  maxPoint: number,
  rows: readonly ScorableRow[]
): ScoredRow[] {
  if (!Number.isFinite(maxPoint) || maxPoint <= 0) {
    throw new RuleValidationError("Los puntos máximos deben ser mayores que cero.");
  }

  if (rows.length === 0) {
    throw new RuleValidationError("La tabla necesita al menos una fila.");
  }

  if (pointSystem === "WtA") {
    const winners = rows.filter((row) => row.position === 1);
    if (winners.length !== 1) {
      throw new RuleValidationError("WtA necesita exactamente una fila ganadora.");
    }
  }

  if (pointSystem === "Pod") {
    const positions = rows.map((row) => row.position);
    if (positions.some((position) => !position || position < 1)) {
      throw new RuleValidationError("Todas las filas de Pod necesitan una posición.");
    }
    if (new Set(positions).size !== positions.length) {
      throw new RuleValidationError("Las posiciones del podio no pueden repetirse.");
    }
  }

  return rows.map((row) => {
    let pointsWon = 0;

    if (pointSystem === "WtA") {
      pointsWon = row.position === 1 ? maxPoint : 0;
    } else if (pointSystem === "Pod") {
      pointsWon = Math.max(maxPoint - ((row.position ?? 1) - 1) * 2, 0);
    } else {
      const value = row.pointsReceivable;
      if (value === null || !Number.isFinite(value) || value < 0 || value > maxPoint) {
        throw new RuleValidationError(
          `Los puntos EC deben estar entre 0 y ${maxPoint}.`
        );
      }
      pointsWon = value;
    }

    return { ...row, pointsWon };
  });
}
