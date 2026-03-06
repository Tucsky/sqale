import { describe, expect, it } from 'vitest'

import { calibrateMetersPerPixel, calibrateMetersPerPixelFromArea, metersToPixels, pixelsToMeters } from '@/features/canvas/math/scale'

describe('scale calibration', () => {
  it('calibrates meters-per-pixel from measured segment', () => {
    const currentMetersPerPixel = 0.01
    const measuredDistance = 5
    const realDistance = 10

    expect(calibrateMetersPerPixel(currentMetersPerPixel, measuredDistance, realDistance)).toBe(0.02)
  })

  it('converts between pixel and meter distances', () => {
    expect(pixelsToMeters(320, 0.02)).toBe(6.4)
    expect(metersToPixels(6.4, 0.02)).toBe(320)
  })

  it('calibrates meters-per-pixel from measured surface', () => {
    const currentMetersPerPixel = 0.01
    const measuredAreaSqm = 12
    const realAreaSqm = 27

    expect(calibrateMetersPerPixelFromArea(currentMetersPerPixel, measuredAreaSqm, realAreaSqm)).toBe(0.015)
  })
})
