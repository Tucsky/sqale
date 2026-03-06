import { normalizeFurnitureFillColor } from '@/features/furniture/model/furnitureColors'
import { MIN_CANVAS_OBJECT_SIZE_METERS, type FurnitureModel, type FurniturePresetModel } from '@/types/domain'
const DEFAULT_FURNITURE_PRESET_NAME = 'Furniture'

interface FurniturePresetSeed {
  name: string
  widthMeters: number
  depthMeters: number
  fillColor: string
}

export interface FurniturePresetDraft {
  name: string
  widthMeters: number
  depthMeters: number
  fillColor: string
}

const DEFAULT_FURNITURE_PRESET_SEEDS: FurniturePresetSeed[] = [
  { name: 'Single Bed', widthMeters: 0.9, depthMeters: 1.9, fillColor: '#0369a1' },
  { name: 'Double Bed', widthMeters: 1.4, depthMeters: 1.9, fillColor: '#0e7490' },
  { name: 'Queen Bed', widthMeters: 1.6, depthMeters: 2, fillColor: '#0f766e' },
  { name: 'Dining Table', widthMeters: 1.8, depthMeters: 0.9, fillColor: '#a16207' },
  { name: 'Kitchen Cabinet', widthMeters: 0.6, depthMeters: 0.6, fillColor: '#a3a3a3' },
  { name: 'Drawer Unit', widthMeters: 0.9, depthMeters: 0.45, fillColor: '#7c2d12' },
  { name: 'Dresser', widthMeters: 1.2, depthMeters: 0.55, fillColor: '#4d7c0f' },
  { name: 'TV', widthMeters: 1.4, depthMeters: 0.12, fillColor: '#1f2937' },
  { name: 'Chair', widthMeters: 0.5, depthMeters: 0.5, fillColor: '#4338ca' },
  { name: 'Desk', widthMeters: 1.4, depthMeters: 0.7, fillColor: '#0369a1' },
  { name: 'Large Desk', widthMeters: 1.5, depthMeters: 0.75, fillColor: '#03a16a' },
  { name: 'Sofa', widthMeters: 1.9, depthMeters: 0.95, fillColor: '#ab9882' },
  { name: 'Coffee Table', widthMeters: 1, depthMeters: 0.6, fillColor: '#92400e' },
]

/**
 * Builds the startup furniture preset catalog used when no user presets exist yet.
 */
export function createDefaultFurniturePresets(createPresetId: () => string): FurniturePresetModel[] {
  const presets: FurniturePresetModel[] = []
  for (const seed of DEFAULT_FURNITURE_PRESET_SEEDS) {
    presets.push({
      id: createPresetId(),
      name: seed.name,
      widthMeters: normalizeFurnitureSize(seed.widthMeters),
      depthMeters: normalizeFurnitureSize(seed.depthMeters),
      fillColor: normalizeFurnitureFillColor(seed.fillColor),
    })
  }
  return presets
}

/**
 * Generates a stable user-facing preset name by appending numeric suffixes on collision.
 */
export function buildNextFurniturePresetName(baseName: string, existingPresets: FurniturePresetModel[]): string {
  const trimmedBaseName = normalizePresetName(baseName)
  const existingNames = new Set<string>()
  for (const preset of existingPresets) {
    existingNames.add(preset.name.trim().toLowerCase())
  }

  if (!existingNames.has(trimmedBaseName.toLowerCase())) {
    return trimmedBaseName
  }

  let suffix = 2
  let nextName = `${trimmedBaseName} ${suffix}`
  while (existingNames.has(nextName.toLowerCase())) {
    suffix += 1
    nextName = `${trimmedBaseName} ${suffix}`
  }

  return nextName
}

/**
 * Creates a normalized preset from user-provided values.
 */
export function createFurniturePreset(
  draft: FurniturePresetDraft,
  existingPresets: FurniturePresetModel[],
  createPresetId: () => string,
): FurniturePresetModel {
  return {
    id: createPresetId(),
    name: buildNextFurniturePresetName(draft.name, existingPresets),
    widthMeters: normalizeFurnitureSize(draft.widthMeters),
    depthMeters: normalizeFurnitureSize(draft.depthMeters),
    fillColor: normalizeFurnitureFillColor(draft.fillColor),
  }
}

/**
 * Captures a furniture object as a reusable preset while preserving editable dimensions/color.
 */
export function createFurniturePresetFromFurniture(
  furniture: Pick<FurnitureModel, 'label' | 'widthMeters' | 'depthMeters' | 'fillColor'>,
  existingPresets: FurniturePresetModel[],
  createPresetId: () => string,
  preferredName: string | null,
): FurniturePresetModel {
  return createFurniturePreset(
    {
      name: preferredName ?? furniture.label,
      widthMeters: furniture.widthMeters,
      depthMeters: furniture.depthMeters,
      fillColor: furniture.fillColor,
    },
    existingPresets,
    createPresetId,
  )
}

function normalizePresetName(name: string): string {
  const trimmedName = name.trim()
  return trimmedName.length > 0 ? trimmedName : DEFAULT_FURNITURE_PRESET_NAME
}

function normalizeFurnitureSize(value: number): number {
  if (!Number.isFinite(value) || value < MIN_CANVAS_OBJECT_SIZE_METERS) {
    return MIN_CANVAS_OBJECT_SIZE_METERS
  }
  return value
}
