export type DrawingPoint = {
  x: number;
  y: number;
};

const MIN_POINT_DISTANCE = 0.003;
const SIMPLIFY_TOLERANCE = 0.0025;
const SMOOTHING_PASSES = 2;

function squaredDistance(a: DrawingPoint, b: DrawingPoint) {
  const x = a.x - b.x;
  const y = a.y - b.y;
  return x * x + y * y;
}

function squaredSegmentDistance(
  point: DrawingPoint,
  start: DrawingPoint,
  end: DrawingPoint
) {
  let x = start.x;
  let y = start.y;
  let dx = end.x - x;
  let dy = end.y - y;

  if (dx !== 0 || dy !== 0) {
    const progress =
      ((point.x - x) * dx + (point.y - y) * dy) / (dx * dx + dy * dy);
    if (progress > 1) {
      x = end.x;
      y = end.y;
    } else if (progress > 0) {
      x += dx * progress;
      y += dy * progress;
    }
  }

  dx = point.x - x;
  dy = point.y - y;
  return dx * dx + dy * dy;
}

function removeCrowdedPoints(points: readonly DrawingPoint[]) {
  if (points.length < 3) return points.map((point) => ({ ...point }));

  const minimumSquared = MIN_POINT_DISTANCE * MIN_POINT_DISTANCE;
  const result: DrawingPoint[] = [{ ...points[0] }];

  for (let index = 1; index < points.length - 1; index += 1) {
    if (squaredDistance(points[index], result[result.length - 1]) >= minimumSquared) {
      result.push({ ...points[index] });
    }
  }

  const last = points.at(-1);
  if (last && squaredDistance(last, result[result.length - 1]) > 0) {
    result.push({ ...last });
  }
  return result;
}

function reducePointerNoise(points: readonly DrawingPoint[]) {
  if (points.length < 3) return points.map((point) => ({ ...point }));

  return points.map((point, index) => {
    if (index === 0 || index === points.length - 1) return { ...point };

    const previous = points[index - 1];
    const next = points[index + 1];
    return {
      x: (previous.x + point.x * 2 + next.x) / 4,
      y: (previous.y + point.y * 2 + next.y) / 4
    };
  });
}

function simplifyPoints(points: readonly DrawingPoint[]) {
  if (points.length <= 2) return points.map((point) => ({ ...point }));

  const toleranceSquared = SIMPLIFY_TOLERANCE * SIMPLIFY_TOLERANCE;
  const keep = new Uint8Array(points.length);
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  keep[0] = 1;
  keep[points.length - 1] = 1;

  while (stack.length) {
    const [start, end] = stack.pop() as [number, number];
    let furthestIndex = -1;
    let furthestDistance = toleranceSquared;

    for (let index = start + 1; index < end; index += 1) {
      const distance = squaredSegmentDistance(points[index], points[start], points[end]);
      if (distance > furthestDistance) {
        furthestDistance = distance;
        furthestIndex = index;
      }
    }

    if (furthestIndex !== -1) {
      keep[furthestIndex] = 1;
      stack.push([start, furthestIndex], [furthestIndex, end]);
    }
  }

  return points.filter((_, index) => keep[index]).map((point) => ({ ...point }));
}

function roundCorners(points: readonly DrawingPoint[]) {
  if (points.length < 3) return points.map((point) => ({ ...point }));

  const result: DrawingPoint[] = [{ ...points[0] }];
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    result.push(
      {
        x: current.x * 0.75 + next.x * 0.25,
        y: current.y * 0.75 + next.y * 0.25
      },
      {
        x: current.x * 0.25 + next.x * 0.75,
        y: current.y * 0.25 + next.y * 0.75
      }
    );
  }
  result.push({ ...points[points.length - 1] });
  return result;
}

/**
 * Converts raw pointer samples into a stable, rounded stroke while preserving
 * the exact beginning and end chosen by the user.
 */
export function smoothStrokePoints(points: readonly DrawingPoint[]) {
  if (points.length <= 2) return points.map((point) => ({ ...point }));

  let result = simplifyPoints(reducePointerNoise(removeCrowdedPoints(points)));
  for (let pass = 0; pass < SMOOTHING_PASSES; pass += 1) {
    result = roundCorners(result);
  }
  return result;
}
