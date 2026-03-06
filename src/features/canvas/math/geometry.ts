import type { PointMeters } from '@/types/domain'

/**
 * Computes polygon area with shoelace because room points are stored in meters.
 * Return is always non-negative square meters.
 */
export function computePolygonAreaSqm(points: PointMeters[]): number {
  if (points.length < 3) {
    return 0
  }

  let twiceArea = 0
  const pointCount = points.length
  for (let index = 0; index < pointCount; index += 1) {
    const currentPoint = points[index]
    const nextPoint = points[(index + 1) % pointCount]
    if (!currentPoint || !nextPoint) {
      continue
    }

    twiceArea += currentPoint.x * nextPoint.y - nextPoint.x * currentPoint.y
  }

  return Math.abs(twiceArea) * 0.5
}

export function distanceMeters(startPoint: PointMeters, endPoint: PointMeters): number {
  const deltaX = endPoint.x - startPoint.x
  const deltaY = endPoint.y - startPoint.y
  return Math.hypot(deltaX, deltaY)
}

export function roundMeters(value: number, fractionDigits = 2): number {
  const multiplier = 10 ** fractionDigits
  return Math.round(value * multiplier) / multiplier
}

export function translatePoints(points: PointMeters[], deltaX: number, deltaY: number): PointMeters[] {
  return points.map((point) => ({ x: point.x + deltaX, y: point.y + deltaY }))
}

export function isPointInsidePolygon(point: PointMeters, polygon: PointMeters[]): boolean {
  if (polygon.length < 3) {
    return false
  }

  let isInside = false
  const pointCount = polygon.length

  for (let index = 0, previousIndex = pointCount - 1; index < pointCount; previousIndex = index, index += 1) {
    const vertex = polygon[index]
    const previousVertex = polygon[previousIndex]
    if (!vertex || !previousVertex) {
      continue
    }

    const intersects =
      (vertex.y > point.y) !== (previousVertex.y > point.y) &&
      point.x <
        ((previousVertex.x - vertex.x) * (point.y - vertex.y)) / (previousVertex.y - vertex.y) +
          vertex.x

    if (intersects) {
      isInside = !isInside
    }
  }

  return isInside
}
