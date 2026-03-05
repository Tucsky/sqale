import { reactive } from 'vue'
import { describe, expect, it } from 'vitest'

import { cloneFloorModel } from '@/core/floorClone'
import type { FloorModel } from '@/types/domain'

const floorFixture: FloorModel = {
  id: 'floor_1',
  name: 'Ground Floor',
  planImage: {
    id: 'plan_1',
    name: 'Plan',
    dataUrl: 'data:image/png;base64,abc',
    position: { x: 0, y: 0 },
    rotationDeg: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    locked: false,
    visible: true,
  },
  scale: { metersPerPixel: 0.01 },
  grid: { visible: true, spacingMeters: 0.5, snap: false },
  rooms: [],
  furnitures: [],
}

describe('floorClone', () => {
  it('clones reactive floor payloads without DataCloneError', () => {
    const reactiveFloor = reactive(floorFixture)
    const clonedFloor = cloneFloorModel(reactiveFloor)

    expect(clonedFloor).toEqual(floorFixture)
    expect(clonedFloor).not.toBe(reactiveFloor)
  })
})
