import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

import {
  createDefaultFurniturePresets,
  createFurniturePreset as buildFurniturePreset,
  createFurniturePresetFromFurniture as buildFurniturePresetFromFurniture,
  type FurniturePresetDraft,
} from '@/features/furniture/model/furniturePresets'
import { syncFloorRoomsAreaSqm } from '@/features/floors/model/floorArea'
import { createId } from '@/lib/utils'
import { MeasurementUnit, type FloorModel, type FurniturePresetModel } from '@/types/domain'

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
const FURNITURE_PRESETS_META_KEY = 'furniture-presets'

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

/**
 * Loads saved furniture presets and seeds default examples once when the key is first created.
 */
export async function listFurniturePresets(): Promise<FurniturePresetModel[]> {
  const database = await getDatabase()
  const savedPresets = await readFurniturePresets(database)
  if (savedPresets) {
    return savedPresets
  }

  return seedDefaultFurniturePresets(database)
}

export async function createFurniturePreset(draft: FurniturePresetDraft): Promise<FurniturePresetModel[]> {
  const database = await getDatabase()
  const existingPresets = (await readFurniturePresets(database)) ?? (await seedDefaultFurniturePresets(database))
  const nextPreset = buildFurniturePreset(draft, existingPresets, () => createId('preset'))
  const nextPresets = [...existingPresets, nextPreset]
  await writeFurniturePresets(database, nextPresets)
  return nextPresets
}

export async function createFurniturePresetFromFurniture(
  furniture: {
    label: string
    widthMeters: number
    depthMeters: number
    fillColor: string
  },
  preferredName: string | null,
): Promise<FurniturePresetModel[]> {
  const database = await getDatabase()
  const existingPresets = (await readFurniturePresets(database)) ?? (await seedDefaultFurniturePresets(database))
  const nextPreset = buildFurniturePresetFromFurniture(
    furniture,
    existingPresets,
    () => createId('preset'),
    preferredName,
  )
  const nextPresets = [...existingPresets, nextPreset]
  await writeFurniturePresets(database, nextPresets)
  return nextPresets
}

export async function deleteFurniturePreset(presetId: string): Promise<FurniturePresetModel[]> {
  const database = await getDatabase()
  const existingPresets = (await readFurniturePresets(database)) ?? (await seedDefaultFurniturePresets(database))
  const nextPresets = existingPresets.filter((preset) => preset.id !== presetId)
  if (nextPresets.length === existingPresets.length) {
    return existingPresets
  }

  await writeFurniturePresets(database, nextPresets)
  return nextPresets
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
    lengthUnit: MeasurementUnit.Meter,
    surfaceUnit: MeasurementUnit.Meter,
    rooms: [],
    roomsAreaSqm: 0,
    furnitures: [],
  }
}

async function seedDefaultFurniturePresets(database: IDBPDatabase<SqaleDbSchema>): Promise<FurniturePresetModel[]> {
  const defaultPresets = createDefaultFurniturePresets(() => createId('preset'))
  await writeFurniturePresets(database, defaultPresets)
  return defaultPresets
}

async function readFurniturePresets(database: IDBPDatabase<SqaleDbSchema>): Promise<FurniturePresetModel[] | null> {
  const record = await database.get('meta', FURNITURE_PRESETS_META_KEY)
  if (!record) {
    return null
  }
  return parseFurniturePresets(record.value)
}

async function writeFurniturePresets(
  database: IDBPDatabase<SqaleDbSchema>,
  presets: FurniturePresetModel[],
): Promise<void> {
  await database.put('meta', {
    key: FURNITURE_PRESETS_META_KEY,
    value: JSON.stringify(presets),
  })
}

function parseFurniturePresets(value: string): FurniturePresetModel[] {
  let parsedValue: unknown
  try {
    parsedValue = JSON.parse(value)
  } catch {
    return []
  }

  if (!Array.isArray(parsedValue)) {
    return []
  }

  const presets: FurniturePresetModel[] = []
  for (const candidate of parsedValue) {
    if (!isFurniturePresetModel(candidate)) {
      continue
    }
    presets.push({
      id: candidate.id,
      name: candidate.name,
      widthMeters: candidate.widthMeters,
      depthMeters: candidate.depthMeters,
      fillColor: candidate.fillColor,
    })
  }
  return presets
}

function isFurniturePresetModel(value: unknown): value is FurniturePresetModel {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<FurniturePresetModel>
  return typeof candidate.id === 'string'
    && typeof candidate.name === 'string'
    && typeof candidate.fillColor === 'string'
    && typeof candidate.widthMeters === 'number'
    && Number.isFinite(candidate.widthMeters)
    && typeof candidate.depthMeters === 'number'
    && Number.isFinite(candidate.depthMeters)
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
