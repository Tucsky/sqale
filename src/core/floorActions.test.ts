import { describe, expect, it } from 'vitest'

import type { EngineFabricObject } from '@/core/canvasObjects'
import { applyFurnitureTransform, applyScaleCalibration } from '@/core/floorActions'
import type { FloorModel } from '@/types/domain'

const floorFixture: FloorModel = {
  id: 'floor_1',
  name: 'Floor',
  planImage: null,
  scale: { metersPerPixel: 0.01 },
  grid: { visible: true, spacingMeters: 0.5, snap: true },
  rooms: [],
  furnitures: [
    {
      id: 'furniture_1',
      label: 'Chair',
      position: { x: 0, y: 0 },
      widthMeters: 1,
      depthMeters: 1,
      rotationDeg: 0,
      roomId: null,
      locked: false,
      visible: true,
    },
  ],
}

describe('floorActions', () => {
  it('updates metersPerPixel when calibration distance changes', () => {
    const floor = structuredClone(floorFixture)
    const changed = applyScaleCalibration(floor, { x: 0, y: 0 }, { x: 4, y: 0 }, 8)

    expect(changed).toBe(true)
    expect(floor.scale.metersPerPixel).toBe(0.02)
  })

  it('snaps furniture transforms to grid spacing when snap is enabled', () => {
    const targetObject = {
      sqaleId: 'furniture_1',
      width: 1.12,
      height: 0.87,
      scaleX: 1,
      scaleY: 1,
      left: 1.21,
      top: 2.37,
      angle: 15,
    } as EngineFabricObject

    const result = applyFurnitureTransform(structuredClone(floorFixture), targetObject)
    expect(result).toBeTruthy()
    expect(result?.widthMeters).toBe(1)
    expect(result?.depthMeters).toBe(1)
    expect(result?.position.x).toBe(1)
    expect(result?.position.y).toBe(2.5)
  })
})
