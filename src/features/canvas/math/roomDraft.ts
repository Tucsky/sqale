import { computePolygonAreaSqm } from '@/features/canvas/math/geometry'
import type { PointMeters } from '@/types/domain'

/**
 * Returns draft room surface only after polygon is explicitly closed.
 */
export function getDraftRoomAreaSqm(points: PointMeters[], isClosed: boolean): number {
  if (!isClosed) {
    return 0
  }

  return computePolygonAreaSqm(points)
}
