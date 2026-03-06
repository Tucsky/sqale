import { MeasurementUnit, MIN_CANVAS_OBJECT_SIZE_METERS, type MeasurementUnit as MeasurementUnitValue } from '@/types/domain'

const METERS_PER_UNIT: Record<MeasurementUnitValue, number> = {
  [MeasurementUnit.Meter]: 1,
  [MeasurementUnit.Centimeter]: 0.01,
  [MeasurementUnit.Foot]: 0.3048,
  [MeasurementUnit.Inch]: 0.0254,
}

const LENGTH_PRECISION: Record<MeasurementUnitValue, number> = {
  [MeasurementUnit.Meter]: 2,
  [MeasurementUnit.Centimeter]: 1,
  [MeasurementUnit.Foot]: 2,
  [MeasurementUnit.Inch]: 2,
}

const AREA_PRECISION: Record<MeasurementUnitValue, number> = {
  [MeasurementUnit.Meter]: 2,
  [MeasurementUnit.Centimeter]: 0,
  [MeasurementUnit.Foot]: 2,
  [MeasurementUnit.Inch]: 2,
}

const LENGTH_INPUT_PRECISION: Record<MeasurementUnitValue, number> = {
  [MeasurementUnit.Meter]: 2,
  [MeasurementUnit.Centimeter]: 0,
  [MeasurementUnit.Foot]: 2,
  [MeasurementUnit.Inch]: 2,
}

const LENGTH_UNIT_OPTION_LABEL: Record<MeasurementUnitValue, string> = {
  [MeasurementUnit.Meter]: 'Meters (m)',
  [MeasurementUnit.Centimeter]: 'Centimeters (cm)',
  [MeasurementUnit.Foot]: 'Feet (ft)',
  [MeasurementUnit.Inch]: 'Inches (in)',
}

const SURFACE_UNIT_OPTION_LABEL: Record<MeasurementUnitValue, string> = {
  [MeasurementUnit.Meter]: 'Square meters (m²)',
  [MeasurementUnit.Centimeter]: 'Square centimeters (cm²)',
  [MeasurementUnit.Foot]: 'Square feet (ft²)',
  [MeasurementUnit.Inch]: 'Square inches (in²)',
}

function getMetersPerUnit(unit: MeasurementUnitValue): number {
  return METERS_PER_UNIT[unit]
}

export function isMeasurementUnit(value: unknown): value is MeasurementUnitValue {
  return value === MeasurementUnit.Meter
    || value === MeasurementUnit.Centimeter
    || value === MeasurementUnit.Foot
    || value === MeasurementUnit.Inch
}

export function resolveMeasurementUnit(unit: MeasurementUnitValue | undefined): MeasurementUnitValue {
  return isMeasurementUnit(unit) ? unit : MeasurementUnit.Meter
}

export function getLengthUnitOptionLabel(unit: MeasurementUnitValue): string {
  return LENGTH_UNIT_OPTION_LABEL[unit]
}

export function getSurfaceUnitOptionLabel(unit: MeasurementUnitValue): string {
  return SURFACE_UNIT_OPTION_LABEL[unit]
}

export function getLengthUnitLabel(unit: MeasurementUnitValue): string {
  return unit
}

export function getAreaUnitLabel(unit: MeasurementUnitValue): string {
  return `${unit}²`
}

export function metersToUnit(valueMeters: number, unit: MeasurementUnitValue): number {
  return valueMeters / getMetersPerUnit(unit)
}

export function unitToMeters(valueInUnit: number, unit: MeasurementUnitValue): number {
  return valueInUnit * getMetersPerUnit(unit)
}

export function squareMetersToUnit(valueSquareMeters: number, unit: MeasurementUnitValue): number {
  const metersPerUnit = getMetersPerUnit(unit)
  return valueSquareMeters / (metersPerUnit * metersPerUnit)
}

export function unitAreaToSquareMeters(valueInUnitArea: number, unit: MeasurementUnitValue): number {
  const metersPerUnit = getMetersPerUnit(unit)
  return valueInUnitArea * metersPerUnit * metersPerUnit
}

export function formatLengthInUnit(valueMeters: number, unit: MeasurementUnitValue): string {
  return metersToUnit(valueMeters, unit).toFixed(LENGTH_PRECISION[unit])
}

export function formatAreaInUnit(valueSquareMeters: number, unit: MeasurementUnitValue): string {
  return squareMetersToUnit(valueSquareMeters, unit).toFixed(AREA_PRECISION[unit])
}

export function normalizeLengthInputValue(valueInUnit: number, unit: MeasurementUnitValue): number {
  return Number(valueInUnit.toFixed(LENGTH_INPUT_PRECISION[unit]))
}

function roundInputValue(value: number): number {
  return Number(value.toFixed(4))
}

export function getLengthInputMin(unit: MeasurementUnitValue, minMeters: number = MIN_CANVAS_OBJECT_SIZE_METERS): number {
  return roundInputValue(metersToUnit(minMeters, unit))
}

export function getLengthInputStep(unit: MeasurementUnitValue, stepMeters: number = 0.01): number {
  return roundInputValue(metersToUnit(stepMeters, unit))
}

export function getAreaInputStep(unit: MeasurementUnitValue, stepSquareMeters: number = 0.01): number {
  return roundInputValue(squareMetersToUnit(stepSquareMeters, unit))
}
