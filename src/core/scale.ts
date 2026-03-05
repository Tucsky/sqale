import type { PointMeters } from '@/types/domain'

export function metersToPixels(distanceMeters: number, metersPerPixel: number): number {
  return distanceMeters / metersPerPixel
}

export function pixelsToMeters(distancePixels: number, metersPerPixel: number): number {
  return distancePixels * metersPerPixel
}

/**
 * Re-calibrates meters-per-pixel from a measured scene segment.
 * sceneDistanceMeters is computed with the currently active scale.
 */
export function calibrateMetersPerPixel(
  currentMetersPerPixel: number,
  sceneDistanceMeters: number,
  realDistanceMeters: number,
): number {
  if (sceneDistanceMeters <= 0) {
    return currentMetersPerPixel
  }

  const scaleRatio = realDistanceMeters / sceneDistanceMeters
  return currentMetersPerPixel * scaleRatio
}

export function scalePoint(point: PointMeters, ratio: number): PointMeters {
  return {
    x: point.x * ratio,
    y: point.y * ratio,
  }
}

export function scaleSize(value: number, ratio: number): number {
  return value * ratio
}
