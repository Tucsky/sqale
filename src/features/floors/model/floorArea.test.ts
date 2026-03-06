import { describe, expect, it } from 'vitest'

import {
  computeFloorRoomsAreaSqm,
  getFloorRoomsAreaSqm,
  syncFloorRoomsAreaSqm,
} from '@/features/floors/model/floorArea'
import type { FloorModel } from '@/types/domain'

const floorFixture: FloorModel = {
  id: 'floor_1',
  name: 'Ground Floor',
  planImage: null,
  scale: { metersPerPixel: 0.01 },
  grid: { visible: false, spacingMeters: 0.5, snap: false },
  rooms: [
    {
      id: 'room_1',
      name: 'Living',
      points: [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 3 },
      ],
      areaSqm: 6,
      opacity: 1,
      locked: false,
      visible: true,
    },
    {
      id: 'room_2',
      name: 'Kitchen',
      points: [
        { x: 0, y: 3 },
        { x: 3, y: 3 },
        { x: 3, y: 5 },
      ],
      areaSqm: 3,
      opacity: 1,
      locked: false,
      visible: true,
    },
  ],
  furnitures: [],
}

describe('floorArea', () => {
  it('sums room areas into floor area', () => {
    expect(computeFloorRoomsAreaSqm(floorFixture)).toBe(9)
  })

  it('reads cached floor area when available', () => {
    const floor = structuredClone(floorFixture)
    floor.roomsAreaSqm = 11.25

    expect(getFloorRoomsAreaSqm(floor)).toBe(11.25)
  })

  it('syncs cached floor area from room areas', () => {
    const floor = structuredClone(floorFixture)
    floor.roomsAreaSqm = 0

    const syncedArea = syncFloorRoomsAreaSqm(floor)

    expect(syncedArea).toBe(9)
    expect(floor.roomsAreaSqm).toBe(9)
  })
})
