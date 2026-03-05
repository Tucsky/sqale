import { reactive } from 'vue'
import { describe, expect, it } from 'vitest'

import type { EngineFabricObject } from '@/core/canvasObjects'
import {
  applyFurnitureTransform,
  applyScaleCalibration,
  cloneFurnitureModel,
  createFurnitureTemplate,
  duplicateFurniture,
  removeLayer,
  setFurnitureFillColor,
  setLayerOpacity,
} from '@/core/floorActions'
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
      fillColor: '#0f766e',
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

  it('updates opacity only for plan image layers', () => {
    const floor = structuredClone(floorFixture)

    expect(setLayerOpacity(floor, 'room_1', 0.45)).toBe(false)
    expect(setLayerOpacity(floor, 'furniture_1', 0.55)).toBe(false)
    expect(setLayerOpacity(floor, 'plan_1', 0.65)).toBe(true)

    expect(floor.rooms[0]?.opacity).toBe(1)
    expect(floor.furnitures[0]?.opacity).toBe(1)
    expect(floor.planImage?.opacity).toBe(0.65)
  })

  it('saves furniture fill colors as normalized hex values', () => {
    const floor = structuredClone(floorFixture)

    expect(setFurnitureFillColor(floor, 'furniture_1', '#abc')).toBe(true)
    expect(floor.furnitures[0]?.fillColor).toBe('#aabbcc')
  })

  it('creates furniture at the provided insertion position', () => {
    const floor = structuredClone(floorFixture)
    const template = createFurnitureTemplate(floor, null, { x: 3.75, y: 2.25 })

    expect(template.position).toEqual({ x: 3.75, y: 2.25 })
  })

  it('duplicates furniture with preserved geometry and valid room assignment', () => {
    const floor = structuredClone(floorFixture)
    const sourceFurniture = floor.furnitures[0]
    expect(sourceFurniture).toBeDefined()
    if (!sourceFurniture) {
      return
    }

    const copiedFurniture = duplicateFurniture(floor, sourceFurniture, { x: 8, y: 6 })

    expect(copiedFurniture.id).not.toBe(sourceFurniture.id)
    expect(copiedFurniture.label).toBe(sourceFurniture.label)
    expect(copiedFurniture.position).toEqual({ x: 8, y: 6 })
    expect(copiedFurniture.widthMeters).toBe(sourceFurniture.widthMeters)
    expect(copiedFurniture.depthMeters).toBe(sourceFurniture.depthMeters)
    expect(copiedFurniture.rotationDeg).toBe(sourceFurniture.rotationDeg)
    expect(copiedFurniture.fillColor).toBe(sourceFurniture.fillColor)
    expect(copiedFurniture.roomId).toBe('room_1')
    expect(copiedFurniture.locked).toBe(false)
    expect(copiedFurniture.visible).toBe(true)

    floor.rooms = []
    const copiedWithoutRoom = duplicateFurniture(floor, sourceFurniture, { x: 1, y: 1 })
    expect(copiedWithoutRoom.roomId).toBeNull()
  })

  it('clones reactive furniture models without DataCloneError', () => {
    const sourceFurniture = floorFixture.furnitures[0]
    expect(sourceFurniture).toBeDefined()
    if (!sourceFurniture) {
      return
    }
    const reactiveFurniture = reactive(structuredClone(sourceFurniture))
    const copiedFurniture = cloneFurnitureModel(reactiveFurniture)

    expect(copiedFurniture).toEqual(sourceFurniture)
    expect(copiedFurniture).not.toBe(reactiveFurniture)
  })
})
