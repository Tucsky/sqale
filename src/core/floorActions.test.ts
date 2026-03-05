import { describe, expect, it } from 'vitest'

import type { EngineFabricObject } from '@/core/canvasObjects'
import { applyFurnitureTransform, applyScaleCalibration, removeLayer, setLayerOpacity } from '@/core/floorActions'
import type { FloorModel } from '@/types/domain'

const floorFixture: FloorModel = {
  id: 'floor_1',
  name: 'Floor',
  planImage: {
    id: 'plan_1',
    name: 'Plan',
    dataUrl: 'data:image/png;base64,fixture',
    position: { x: 0, y: 0 },
    rotationDeg: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    locked: false,
    visible: true,
  },
  scale: { metersPerPixel: 0.01 },
  grid: { visible: true, spacingMeters: 0.5, snap: true },
  rooms: [
    {
      id: 'room_1',
      name: 'Bedroom',
      points: [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 3 },
        { x: 0, y: 3 },
      ],
      areaSqm: 12,
      opacity: 1,
      locked: false,
      visible: true,
    },
  ],
  furnitures: [
    {
      id: 'furniture_1',
      label: 'Chair',
      position: { x: 0, y: 0 },
      widthMeters: 1,
      depthMeters: 1,
      rotationDeg: 0,
      roomId: 'room_1',
      opacity: 1,
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

  it('removes a room and clears room assignments for linked furniture', () => {
    const floor = structuredClone(floorFixture)
    const deleted = removeLayer(floor, 'room_1')

    expect(deleted).toBe(true)
    expect(floor.rooms).toHaveLength(0)
    expect(floor.furnitures[0]?.roomId).toBeNull()
  })

  it('updates opacity for room, furniture and plan image layers', () => {
    const floor = structuredClone(floorFixture)

    expect(setLayerOpacity(floor, 'room_1', 0.45)).toBe(true)
    expect(setLayerOpacity(floor, 'furniture_1', 0.55)).toBe(true)
    expect(setLayerOpacity(floor, 'plan_1', 0.65)).toBe(true)

    expect(floor.rooms[0]?.opacity).toBe(0.45)
    expect(floor.furnitures[0]?.opacity).toBe(0.55)
    expect(floor.planImage?.opacity).toBe(0.65)
  })
})
