import { describe, expect, it } from 'vitest'

import { buildLayerTree } from '@/core/layerModel'
import { LayerType, type FloorModel } from '@/types/domain'

const floorFixture: FloorModel = {
  id: 'floor_1',
  name: 'Ground Floor',
  planImage: {
    id: 'plan_1',
    name: 'Plan Image',
    dataUrl: 'data:image/png;base64,abc',
    position: { x: 0, y: 0 },
    rotationDeg: 0,
    opacity: 1,
    locked: false,
    visible: true,
  },
  scale: {
    metersPerPixel: 0.01,
  },
  grid: {
    visible: false,
    spacingMeters: 0.5,
    snap: false,
  },
  rooms: [
    {
      id: 'room_living',
      name: 'Living Room',
      points: [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 3 },
      ],
      areaSqm: 6,
      locked: false,
      visible: true,
    },
  ],
  furnitures: [
    {
      id: 'furn_sofa',
      label: 'Sofa',
      position: { x: 1, y: 1 },
      widthMeters: 2,
      depthMeters: 1,
      rotationDeg: 0,
      roomId: 'room_living',
      locked: false,
      visible: true,
    },
    {
      id: 'furn_table',
      label: 'Table',
      position: { x: 5, y: 2 },
      widthMeters: 1,
      depthMeters: 1,
      rotationDeg: 0,
      roomId: null,
      locked: false,
      visible: true,
    },
  ],
}

describe('layer model', () => {
  it('builds hierarchy where rooms contain furniture', () => {
    const layerTree = buildLayerTree(floorFixture)

    expect(layerTree.type).toBe(LayerType.Floor)
    expect(layerTree.children[0]?.type).toBe(LayerType.PlanImage)

    const roomsCollection = layerTree.children.find((child) => child.name === 'Rooms')
    expect(roomsCollection).toBeDefined()

    const livingRoomNode = roomsCollection?.children.find((child) => child.id === 'room_living')
    expect(livingRoomNode?.children[0]?.id).toBe('furn_sofa')

    const unassignedNode = roomsCollection?.children.find((child) => child.name === 'Unassigned Furniture')
    expect(unassignedNode?.children[0]?.id).toBe('furn_table')
  })
})
