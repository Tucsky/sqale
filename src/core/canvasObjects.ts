import { fabric } from 'fabric'

import { LayerType, type FurnitureModel, type PlanImageModel, type PointMeters, type RoomModel } from '@/types/domain'

export interface EngineFabricObject extends fabric.Object {
  sqaleId?: string
  sqaleType?: (typeof LayerType)[keyof typeof LayerType]
}

const ROOM_FILL = 'rgba(14, 165, 233, 0.18)'
const ROOM_STROKE = '#0284c7'
const FURNITURE_FILL = 'rgba(15, 118, 110, 0.24)'
const FURNITURE_STROKE = '#0f766e'

export function createPlanImageObject(
  planImage: PlanImageModel,
  metersPerPixel: number,
): Promise<EngineFabricObject> {
  return new Promise((resolve) => {
    fabric.Image.fromURL(planImage.dataUrl, (rawImage) => {
      const planObject = rawImage as EngineFabricObject
      planObject.set({
        left: planImage.position.x,
        top: planImage.position.y,
        angle: planImage.rotationDeg,
        opacity: planImage.opacity,
        visible: planImage.visible,
        originX: 'left',
        originY: 'top',
        selectable: !planImage.locked,
        evented: !planImage.locked,
        hasBorders: !planImage.locked,
        hasControls: !planImage.locked,
        scaleX: metersPerPixel * planImage.scaleX,
        scaleY: metersPerPixel * planImage.scaleY,
      })

      planObject.sqaleId = planImage.id
      planObject.sqaleType = LayerType.PlanImage
      resolve(planObject)
    })
  })
}

export function createRoomObject(room: RoomModel): EngineFabricObject {
  const roomPolygon = new fabric.Polygon(room.points, {
    fill: ROOM_FILL,
    stroke: ROOM_STROKE,
    strokeWidth: 0.01,
    objectCaching: false,
    selectable: !room.locked,
    evented: !room.locked,
    visible: room.visible,
    opacity: room.opacity,
    hasBorders: true,
    hasControls: true,
    transparentCorners: false,
    cornerStyle: 'circle',
  }) as EngineFabricObject

  roomPolygon.sqaleId = room.id
  roomPolygon.sqaleType = LayerType.Room
  return roomPolygon
}

export function createFurnitureObject(furniture: FurnitureModel): EngineFabricObject {
  const furnitureRect = new fabric.Rect({
    left: furniture.position.x,
    top: furniture.position.y,
    width: furniture.widthMeters,
    height: furniture.depthMeters,
    angle: furniture.rotationDeg,
    fill: FURNITURE_FILL,
    stroke: FURNITURE_STROKE,
    strokeWidth: 0.01,
    originX: 'center',
    originY: 'center',
    selectable: !furniture.locked,
    evented: !furniture.locked,
    visible: furniture.visible,
    opacity: furniture.opacity,
    transparentCorners: false,
    cornerStyle: 'circle',
    lockUniScaling: false,
  }) as EngineFabricObject

  furnitureRect.sqaleId = furniture.id
  furnitureRect.sqaleType = LayerType.Furniture
  return furnitureRect
}

export function createRoomDraft(points: PointMeters[]): fabric.Polyline {
  return new fabric.Polyline(points, {
    fill: 'rgba(56, 189, 248, 0.12)',
    stroke: '#0284c7',
    strokeWidth: 0.05,
    selectable: false,
    evented: false,
  })
}

export function polygonToWorldPoints(polygon: fabric.Polygon): PointMeters[] {
  const transformMatrix = polygon.calcTransformMatrix()
  const polygonPoints = polygon.points ?? []
  const offsetX = polygon.pathOffset?.x ?? 0
  const offsetY = polygon.pathOffset?.y ?? 0

  return polygonPoints.map((point) => {
    const relativePoint = new fabric.Point(point.x - offsetX, point.y - offsetY)
    const transformedPoint = fabric.util.transformPoint(relativePoint, transformMatrix)
    return {
      x: transformedPoint.x,
      y: transformedPoint.y,
    }
  })
}

export function snapValue(value: number, spacing: number): number {
  return Math.round(value / spacing) * spacing
}
