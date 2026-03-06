import { describe, expect, it } from 'vitest'

import {
  buildNextFurniturePresetName,
  createDefaultFurniturePresets,
  createFurniturePreset,
  createFurniturePresetFromFurniture,
} from '@/features/furniture/model/furniturePresets'
import type { FurniturePresetModel } from '@/types/domain'

function createIdGenerator(prefix: string): () => string {
  let sequence = 0
  return () => {
    sequence += 1
    return `${prefix}_${sequence}`
  }
}

describe('furniturePresets', () => {
  it('seeds startup presets with expected furniture examples', () => {
    const presets = createDefaultFurniturePresets(createIdGenerator('preset'))
    const presetNames = presets.map((preset) => preset.name)

    expect(presetNames).toContain('Single Bed')
    expect(presetNames).toContain('Double Bed')
    expect(presetNames).toContain('Dining Table')
    expect(presetNames).toContain('Drawer Unit')
    expect(presetNames).toContain('Dresser')
    expect(presetNames).toContain('TV')
    expect(presetNames).toContain('Chair')
  })

  it('builds incremental names when collisions exist', () => {
    const existingPresets: FurniturePresetModel[] = [
      { id: 'preset_1', name: 'Chair', widthMeters: 0.5, depthMeters: 0.5, fillColor: '#111111' },
      { id: 'preset_2', name: 'chair 2', widthMeters: 0.5, depthMeters: 0.5, fillColor: '#222222' },
    ]

    expect(buildNextFurniturePresetName('Chair', existingPresets)).toBe('Chair 3')
    expect(buildNextFurniturePresetName('  ', existingPresets)).toBe('Furniture')
  })

  it('normalizes invalid sizes and colors when creating presets', () => {
    const preset = createFurniturePreset(
      {
        name: 'Table',
        widthMeters: -1,
        depthMeters: Number.NaN,
        fillColor: '#abc',
      },
      [],
      createIdGenerator('preset'),
    )

    expect(preset.widthMeters).toBe(0.05)
    expect(preset.depthMeters).toBe(0.05)
    expect(preset.fillColor).toBe('#aabbcc')
  })

  it('creates presets from furniture and resolves duplicate names', () => {
    const existingPresets: FurniturePresetModel[] = [
      { id: 'preset_1', name: 'Desk', widthMeters: 1.2, depthMeters: 0.7, fillColor: '#0369a1' },
    ]
    const preset = createFurniturePresetFromFurniture(
      {
        label: 'Desk',
        widthMeters: 1.8,
        depthMeters: 0.8,
        fillColor: '#155e75',
      },
      existingPresets,
      createIdGenerator('preset'),
      'Desk',
    )

    expect(preset.name).toBe('Desk 2')
    expect(preset.widthMeters).toBe(1.8)
    expect(preset.depthMeters).toBe(0.8)
    expect(preset.fillColor).toBe('#155e75')
  })
})
