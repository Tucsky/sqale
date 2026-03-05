import { fabric } from 'fabric'

import { buildFurniturePaint } from '@/core/furnitureColors'
import { LayerType, type FurnitureModel, type PlanImageModel, type PointMeters, type RoomModel } from '@/types/domain'

export interface EngineFabricObject extends fabric.Object {
  sqaleId?: string
  sqaleType?: (typeof LayerType)[keyof typeof LayerType]
}

const ROOM_STROKE = '#0284c7'

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
    fill: 'transparent',
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
  const furniturePaint = buildFurniturePaint(furniture.fillColor)
  const furnitureRect = new fabric.Rect({
    left: furniture.position.x,
    top: furniture.position.y,
    width: furniture.widthMeters,
    height: furniture.depthMeters,
    angle: furniture.rotationDeg,
    fill: furniturePaint.fillColor,
    stroke: furniturePaint.strokeColor,
    strokeWidth: 0.01,
    originX: 'center',
    originY: 'center',
    selectable: !furniture.locked,
    evented: !furniture.locked,
    visible: furniture.visible,
    opacity: 1,
    transparentCorners: false,
    cornerStyle: 'circle',
    lockUniScaling: false,
  }) as EngineFabricObject

  furnitureRect.sqaleId = furniture.id
  furnitureRect.sqaleType = LayerType.Furniture
  return furnitureRect
}

export function applyFurniturePaintToSceneObject(sceneObject: EngineFabricObject, fillColor: string): void {
  const furniturePaint = buildFurniturePaint(fillColor)
  sceneObject.set({
    fill: furniturePaint.fillColor,
    stroke: furniturePaint.strokeColor,
    opacity: 1,
  })
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
