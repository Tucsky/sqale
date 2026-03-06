import { describe, expect, it } from 'vitest'

import type { EngineFabricObject } from '@/features/canvas/engine/canvasObjects'
import { applyLayerFrameToSceneObject, projectLayerSurfaceSqm, type LayerEditSnapshot } from '@/features/layers/model/layerEditing'
import { LayerType, MIN_CANVAS_OBJECT_SIZE_METERS } from '@/types/domain'

const roomSnapshot: LayerEditSnapshot = {
  id: 'room_1',
  type: LayerType.Room,
  name: 'Room 1',
  visible: true,
  locked: false,
  fillColor: null,
  x: 0,
  y: 0,
  width: 4,
  height: 3,
  surfaceSqm: 10,
  opacity: 1,
}

const furnitureSnapshot: LayerEditSnapshot = {
  id: 'furniture_1',
  type: LayerType.Furniture,
  name: 'Chair',
  visible: true,
  locked: false,
  fillColor: '#0f766e',
  x: 0,
  y: 0,
  width: 2,
  height: 1,
  surfaceSqm: 2,
  opacity: 1,
}

describe('layerEditing', () => {
  it('clamps furniture frame dimensions to shared minimum object size', () => {
    const updates: Record<string, number | string>[] = []
    const sceneObject = {
      sqaleType: LayerType.Furniture,
      set(payload: Record<string, number | string>) {
        updates.push(payload)
      },
      setCoords() {},
    } as unknown as EngineFabricObject

    const applied = applyLayerFrameToSceneObject(sceneObject, {
      x: 1.2,
      y: 2.4,
      width: 0.004,
      height: 0.009,
    })

    expect(applied).toBe(true)
    expect(updates).toEqual([
      {
        left: 1.2,
        top: 2.4,
        width: MIN_CANVAS_OBJECT_SIZE_METERS,
        height: MIN_CANVAS_OBJECT_SIZE_METERS,
        scaleX: 1,
        scaleY: 1,
      },
    ])
  })

  it('projects room surface from canonical polygon area and dimension ratios', () => {
    const projectedSurfaceSqm = projectLayerSurfaceSqm(roomSnapshot, 8, 6)
    expect(projectedSurfaceSqm).toBe(40)
  })

  it('uses width x height for rectangular layers', () => {
    const projectedSurfaceSqm = projectLayerSurfaceSqm(furnitureSnapshot, 3, 1.5)
    expect(projectedSurfaceSqm).toBe(4.5)
  })
})
