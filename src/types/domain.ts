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
} as const

export type EngineMode = (typeof EngineMode)[keyof typeof EngineMode]

export const GRID_SPACING_OPTIONS = [0.25, 0.5, 1] as const
export type GridSpacing = (typeof GRID_SPACING_OPTIONS)[number]

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
  position: PointMeters
  widthMeters: number
  depthMeters: number
  rotationDeg: number
  roomId: string | null
  opacity: number
  locked: boolean
  visible: boolean
}

export interface FloorModel {
  id: string
  name: string
  planImage: PlanImageModel | null
  scale: ScaleModel
  grid: GridModel
  rooms: RoomModel[]
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
