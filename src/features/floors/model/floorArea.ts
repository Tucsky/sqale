import type { FloorModel, RoomModel } from '@/types/domain'

/**
 * Sums persisted room polygon areas to produce the floor-level total surface.
 */
export function computeRoomsAreaSqm(rooms: RoomModel[]): number {
  let totalAreaSqm = 0
  for (const room of rooms) {
    if (Number.isFinite(room.areaSqm)) {
      totalAreaSqm += room.areaSqm
    }
  }

  return totalAreaSqm
}

export function computeFloorRoomsAreaSqm(floor: Pick<FloorModel, 'rooms'>): number {
  return computeRoomsAreaSqm(floor.rooms)
}

/**
 * Reads cached floor area when available, otherwise derives it from room records.
 */
export function getFloorRoomsAreaSqm(floor: FloorModel): number {
  if (typeof floor.roomsAreaSqm === 'number' && Number.isFinite(floor.roomsAreaSqm)) {
    return floor.roomsAreaSqm
  }

  return computeFloorRoomsAreaSqm(floor)
}

export function syncFloorRoomsAreaSqm(floor: FloorModel): number {
  const roomsAreaSqm = computeFloorRoomsAreaSqm(floor)
  floor.roomsAreaSqm = roomsAreaSqm
  return roomsAreaSqm
}
