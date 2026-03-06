import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

import { syncFloorRoomsAreaSqm } from '@/features/floors/model/floorArea'
import { createId } from '@/lib/utils'
import type { FloorModel } from '@/types/domain'

interface MetaRecord {
  key: string
  value: string
}

interface SqaleDbSchema extends DBSchema {
  floors: {
    key: string
    value: FloorModel
    indexes: {
      by_name: string
    }
  }
  meta: {
    key: string
    value: MetaRecord
  }
}

const DB_NAME = 'sqale-db'
const DB_VERSION = 1
const CURRENT_FLOOR_META_KEY = 'current-floor-id'

let sqaleDatabasePromise: Promise<IDBPDatabase<SqaleDbSchema>> | null = null

function getDatabase(): Promise<IDBPDatabase<SqaleDbSchema>> {
  if (!sqaleDatabasePromise) {
    sqaleDatabasePromise = openDB<SqaleDbSchema>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        const floorsStore = database.createObjectStore('floors', { keyPath: 'id' })
        floorsStore.createIndex('by_name', 'name')
        database.createObjectStore('meta', { keyPath: 'key' })
      },
    })
  }

  return sqaleDatabasePromise
}

export async function listFloors(): Promise<FloorModel[]> {
  const database = await getDatabase()
  return database.getAllFromIndex('floors', 'by_name')
}

export async function getFloorById(floorId: string): Promise<FloorModel | undefined> {
  const database = await getDatabase()
  return database.get('floors', floorId)
}

export async function saveFloor(floor: FloorModel): Promise<void> {
  const database = await getDatabase()
  syncFloorRoomsAreaSqm(floor)
  await database.put('floors', floor)
}

export async function deleteFloor(floorId: string): Promise<void> {
  const database = await getDatabase()
  await database.delete('floors', floorId)
}

export async function setCurrentFloorId(floorId: string): Promise<void> {
  const database = await getDatabase()
  await database.put('meta', { key: CURRENT_FLOOR_META_KEY, value: floorId })
}

export async function getCurrentFloorId(): Promise<string | undefined> {
  const database = await getDatabase()
  const record = await database.get('meta', CURRENT_FLOOR_META_KEY)
  return record?.value
}

export function createEmptyFloor(name: string): FloorModel {
  return {
    id: createId('floor'),
    name,
    planImage: null,
    scale: {
      metersPerPixel: 0.01,
    },
    grid: {
      visible: false,
      spacingMeters: 0.5,
      snap: false,
    },
    rooms: [],
    roomsAreaSqm: 0,
    furnitures: [],
  }
}

export async function bootstrapFloorState(): Promise<{ floors: FloorModel[]; currentFloor: FloorModel }> {
  const existingFloors = await listFloors()
  if (existingFloors.length === 0) {
    const defaultFloor = createEmptyFloor('Ground Floor')
    await saveFloor(defaultFloor)
    await setCurrentFloorId(defaultFloor.id)
    return {
      floors: [defaultFloor],
      currentFloor: defaultFloor,
    }
  }

  const selectedFloorId = await getCurrentFloorId()
  const selectedFloorById = selectedFloorId
    ? existingFloors.find((candidate) => candidate.id === selectedFloorId)
    : undefined
  const selectedFloor = selectedFloorById ?? existingFloors[0]
  if (!selectedFloor) {
    const fallbackFloor = createEmptyFloor('Ground Floor')
    await saveFloor(fallbackFloor)
    await setCurrentFloorId(fallbackFloor.id)
    return {
      floors: [fallbackFloor],
      currentFloor: fallbackFloor,
    }
  }

  await setCurrentFloorId(selectedFloor.id)

  return {
    floors: existingFloors,
    currentFloor: selectedFloor,
  }
}
