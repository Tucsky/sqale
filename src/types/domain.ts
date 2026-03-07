export const LayerType = {
  Floor: 'floor',
  PlanImage: 'planImage',
  Room: 'room',
  Furniture: 'furniture',
  Collection: 'collection',
} as const

export type LayerType = (typeof LayerType)[keyof typeof LayerType]

export const EngineMode = {
  Idle: 'idle',
  DrawRoom: 'drawRoom',
  CalibrateScale: 'calibrateScale',
  MeasureDistance: 'measureDistance',
} as const

export type EngineMode = (typeof EngineMode)[keyof typeof EngineMode]

export const ScaleCalibrationMode = {
  TwoPoint: 'twoPoint',
  Surface: 'surface',
} as const

export type ScaleCalibrationMode = (typeof ScaleCalibrationMode)[keyof typeof ScaleCalibrationMode]

export const GRID_SPACING_OPTIONS = [0.0625, 0.125, 0.25, 0.5, 1] as const
export type GridSpacing = (typeof GRID_SPACING_OPTIONS)[number]

export const MeasurementUnit = {
  Meter: 'm',
  Centimeter: 'cm',
  Foot: 'ft',
  Inch: 'in',
} as const

export type MeasurementUnit = (typeof MeasurementUnit)[keyof typeof MeasurementUnit]

export const MEASUREMENT_UNIT_OPTIONS = [
  MeasurementUnit.Meter,
  MeasurementUnit.Centimeter,
  MeasurementUnit.Foot,
  MeasurementUnit.Inch,
] as const

export const MIN_CANVAS_OBJECT_SIZE_METERS = 0.05

export interface PointMeters {
  x: number
  y: number
}

export interface ScaleModel {
  metersPerPixel: number
}

export interface GridModel {
  visible: boolean
  spacingMeters: GridSpacing
  snap: boolean
}

export interface PlanImageModel {
  id: string
  name: string
  dataUrl: string
  position: PointMeters
  rotationDeg: number
  scaleX: number
  scaleY: number
  opacity: number
  locked: boolean
  visible: boolean
}

export interface RoomModel {
  id: string
  name: string
  points: PointMeters[]
  areaSqm: number
  opacity: number
  locked: boolean
  visible: boolean
}

export interface FurnitureModel {
  id: string
  label: string
  fillColor: string
  position: PointMeters
  widthMeters: number
  depthMeters: number
  rotationDeg: number
  roomId: string | null
  opacity: number
  locked: boolean
  visible: boolean
}

export interface FurniturePresetModel {
  id: string
  name: string
  widthMeters: number
  depthMeters: number
  fillColor: string
}

export interface FloorModel {
  id: string
  name: string
  planImage: PlanImageModel | null
  scale: ScaleModel
  grid: GridModel
  lengthUnit?: MeasurementUnit
  surfaceUnit?: MeasurementUnit
  rooms: RoomModel[]
  roomsAreaSqm?: number
  furnitures: FurnitureModel[]
}

export interface LayerNode {
  id: string
  name: string
  type: LayerType
  parentId: string | null
  visible: boolean
  locked: boolean
  children: LayerNode[]
}

export interface CalibrationResult {
  firstPoint: PointMeters
  secondPoint: PointMeters
  measuredDistance: number
}
