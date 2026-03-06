import { describe, expect, it } from 'vitest'

import { MeasurementUnit } from '@/types/domain'
import {
  formatAreaInUnit,
  formatLengthInUnit,
  getAreaInputStep,
  getLengthUnitOptionLabel,
  getLengthInputMin,
  getLengthInputStep,
  getAreaUnitLabel,
  getLengthUnitLabel,
  getSurfaceUnitOptionLabel,
  metersToUnit,
  resolveMeasurementUnit,
  squareMetersToUnit,
  unitAreaToSquareMeters,
  unitToMeters,
} from '@/features/settings/model/measurementUnits'

describe('measurementUnits', () => {
  it('converts length values between meters and selected unit', () => {
    expect(metersToUnit(1, MeasurementUnit.Centimeter)).toBe(100)
    expect(metersToUnit(1, MeasurementUnit.Foot)).toBeCloseTo(3.280839895, 9)
    expect(unitToMeters(12, MeasurementUnit.Inch)).toBeCloseTo(0.3048, 9)
  })

  it('converts area values between square meters and selected unit', () => {
    expect(squareMetersToUnit(1, MeasurementUnit.Centimeter)).toBe(10000)
    expect(squareMetersToUnit(10, MeasurementUnit.Foot)).toBeCloseTo(107.639104167, 9)
    expect(unitAreaToSquareMeters(100, MeasurementUnit.Centimeter)).toBeCloseTo(0.01, 9)
  })

  it('formats unit labels and values for UI', () => {
    expect(getLengthUnitLabel(MeasurementUnit.Foot)).toBe('ft')
    expect(getAreaUnitLabel(MeasurementUnit.Foot)).toBe('ft²')
    expect(getLengthUnitOptionLabel(MeasurementUnit.Centimeter)).toBe('Centimeters (cm)')
    expect(getSurfaceUnitOptionLabel(MeasurementUnit.Foot)).toBe('Square feet (ft²)')
    expect(formatLengthInUnit(1, MeasurementUnit.Meter)).toBe('1.00')
    expect(formatAreaInUnit(12, MeasurementUnit.Foot)).toBe('129.17')
  })

  it('derives input bounds from canonical meter-based constraints', () => {
    expect(getLengthInputMin(MeasurementUnit.Centimeter)).toBe(5)
    expect(getLengthInputStep(MeasurementUnit.Centimeter)).toBe(1)
    expect(getAreaInputStep(MeasurementUnit.Centimeter)).toBe(100)
  })

  it('falls back to meters for unknown persisted values', () => {
    expect(resolveMeasurementUnit(undefined)).toBe(MeasurementUnit.Meter)
    expect(resolveMeasurementUnit(MeasurementUnit.Inch)).toBe(MeasurementUnit.Inch)
  })
})
