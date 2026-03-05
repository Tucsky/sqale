import { describe, expect, it } from 'vitest'

import { projectLayerSurfaceSqm, type LayerEditSnapshot } from '@/core/layerEditing'
import { LayerType } from '@/types/domain'

const roomSnapshot: LayerEditSnapshot = {
  id: 'room_1',
  type: LayerType.Room,
  name: 'Room 1',
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
  x: 0,
  y: 0,
  width: 2,
  height: 1,
  surfaceSqm: 2,
  opacity: 1,
}

describe('layerEditing', () => {
  it('projects room surface from canonical polygon area and dimension ratios', () => {
    const projectedSurfaceSqm = projectLayerSurfaceSqm(roomSnapshot, 8, 6)
    expect(projectedSurfaceSqm).toBe(40)
  })

  it('uses width x height for rectangular layers', () => {
    const projectedSurfaceSqm = projectLayerSurfaceSqm(furnitureSnapshot, 3, 1.5)
    expect(projectedSurfaceSqm).toBe(4.5)
  })
})
