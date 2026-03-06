import { describe, expect, it } from 'vitest'

import { computePolygonAreaSqm, distanceMeters, isPointInsidePolygon } from '@/features/canvas/math/geometry'

describe('geometry', () => {
  it('computes room area with shoelace formula in square meters', () => {
    const rectangle = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 3 },
      { x: 0, y: 3 },
    ]

    expect(computePolygonAreaSqm(rectangle)).toBe(12)
  })

  it('computes euclidean distances in meters', () => {
    expect(distanceMeters({ x: 1, y: 1 }, { x: 4, y: 5 })).toBe(5)
  })

  it('detects containment for room assignment', () => {
    const roomPolygon = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 5, y: 5 },
      { x: 0, y: 5 },
    ]

    expect(isPointInsidePolygon({ x: 2, y: 2 }, roomPolygon)).toBe(true)
    expect(isPointInsidePolygon({ x: 6, y: 2 }, roomPolygon)).toBe(false)
  })
})
