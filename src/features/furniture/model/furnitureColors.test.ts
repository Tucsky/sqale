import { describe, expect, it } from 'vitest'

import {
  DEFAULT_FURNITURE_FILL_COLOR,
  buildFurniturePaint,
  normalizeFurnitureFillColor,
} from '@/features/furniture/model/furnitureColors'

describe('furnitureColors', () => {
  it('builds deterministic fill and brighter stroke colors', () => {
    const paint = buildFurniturePaint('#204060')

    expect(paint.baseColor).toBe('#204060')
    expect(paint.fillColor).toBe('rgba(32, 64, 96, 0.8)')
    expect(paint.strokeColor).toBe('#6e8398')
  })

  it('normalizes short hex values and rejects invalid colors', () => {
    expect(normalizeFurnitureFillColor('#abc')).toBe('#aabbcc')
    expect(normalizeFurnitureFillColor('oops')).toBe(DEFAULT_FURNITURE_FILL_COLOR)
  })
})
