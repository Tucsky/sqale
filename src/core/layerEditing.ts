import type { EngineFabricObject } from '@/core/canvasObjects'
import { LayerType, type FloorModel } from '@/types/domain'

export interface LayerEditSnapshot {
  id: string
  type: LayerType
  name: string
  visible: boolean
  locked: boolean
  fillColor: string | null
  x: number
  y: number
  width: number
  height: number
  surfaceSqm: number
  opacity: number
}

export interface LayerFrameInput {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Resolves editable layer data from current floor state and scene object cache.
 */
export function buildLayerEditSnapshot(
  floor: FloorModel,
  objectById: Map<string, EngineFabricObject>,
  layerId: string,
): LayerEditSnapshot | null {
  const sceneObject = objectById.get(layerId)
  if (!sceneObject?.sqaleType) {
    return null
  }

  if (sceneObject.sqaleType === LayerType.PlanImage && floor.planImage) {
    const width = sceneObject.getScaledWidth()
    const height = sceneObject.getScaledHeight()
    return {
      id: layerId,
      type: LayerType.PlanImage,
      name: floor.planImage.name,
      visible: floor.planImage.visible,
      locked: floor.planImage.locked,
      fillColor: null,
      x: floor.planImage.position.x,
      y: floor.planImage.position.y,
      width,
      height,
      surfaceSqm: width * height,
      opacity: floor.planImage.opacity,
    }
  }

  if (sceneObject.sqaleType === LayerType.Room) {
    const room = floor.rooms.find((candidate) => candidate.id === layerId)
    if (!room) {
      return null
    }

    return {
      id: layerId,
      type: LayerType.Room,
      name: room.name,
      visible: room.visible,
      locked: room.locked,
      fillColor: null,
      x: sceneObject.left ?? 0,
      y: sceneObject.top ?? 0,
      width: sceneObject.getScaledWidth(),
      height: sceneObject.getScaledHeight(),
      surfaceSqm: room.areaSqm,
      opacity: room.opacity,
    }
  }

  if (sceneObject.sqaleType !== LayerType.Furniture) {
    return null
  }

  const furniture = floor.furnitures.find((candidate) => candidate.id === layerId)
  if (!furniture) {
    return null
  }

  return {
    id: layerId,
    type: LayerType.Furniture,
    name: furniture.label,
    visible: furniture.visible,
    locked: furniture.locked,
    fillColor: furniture.fillColor ?? null,
    x: furniture.position.x,
    y: furniture.position.y,
    width: furniture.widthMeters,
    height: furniture.depthMeters,
    surfaceSqm: furniture.widthMeters * furniture.depthMeters,
    opacity: furniture.opacity,
  }
}

export function applyLayerFrameToSceneObject(sceneObject: EngineFabricObject, nextFrame: LayerFrameInput): boolean {
  const nextWidth = Math.max(0.05, nextFrame.width)
  const nextHeight = Math.max(0.05, nextFrame.height)
  if (!sceneObject.sqaleType) {
    return false
  }

  if (sceneObject.sqaleType === LayerType.PlanImage) {
    const sourceWidth = sceneObject.width ?? nextWidth
    const sourceHeight = sceneObject.height ?? nextHeight
    sceneObject.set({
      left: nextFrame.x,
      top: nextFrame.y,
      scaleX: nextWidth / sourceWidth,
      scaleY: nextHeight / sourceHeight,
    })
    sceneObject.setCoords()
    return true
  }

  if (sceneObject.sqaleType === LayerType.Room) {
    const currentWidth = sceneObject.getScaledWidth()
    const currentHeight = sceneObject.getScaledHeight()
    if (currentWidth <= 0 || currentHeight <= 0) {
      return false
    }

    sceneObject.set({
      left: nextFrame.x,
      top: nextFrame.y,
      scaleX: (sceneObject.scaleX ?? 1) * (nextWidth / currentWidth),
      scaleY: (sceneObject.scaleY ?? 1) * (nextHeight / currentHeight),
    })
    sceneObject.setCoords()
    return true
  }

  sceneObject.set({
    left: nextFrame.x,
    top: nextFrame.y,
    width: nextWidth,
    height: nextHeight,
    scaleX: 1,
    scaleY: 1,
  })
  sceneObject.setCoords()
  return true
}

/**
 * Computes surface from editable dimensions with room-specific polygon semantics.
 * Rooms keep their canonical polygon surface and scale it by width/height ratios.
 */
export function projectLayerSurfaceSqm(layer: LayerEditSnapshot, width: number, height: number): number {
  const nextWidth = Math.max(0, width)
  const nextHeight = Math.max(0, height)
  if (layer.type !== LayerType.Room) {
    return nextWidth * nextHeight
  }

  if (layer.width <= 0 || layer.height <= 0) {
    return layer.surfaceSqm
  }

  return layer.surfaceSqm * (nextWidth / layer.width) * (nextHeight / layer.height)
}
