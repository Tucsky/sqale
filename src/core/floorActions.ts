import { computePolygonAreaSqm, distanceMeters, isPointInsidePolygon } from '@/core/geometry'
import { DEFAULT_FURNITURE_FILL_COLOR, normalizeFurnitureFillColor } from '@/core/furnitureColors'
import { calibrateMetersPerPixel } from '@/core/scale'
import { createId } from '@/lib/utils'
import type { FloorModel, FurnitureModel, PointMeters } from '@/types/domain'

import { snapValue, type EngineFabricObject } from './canvasObjects'

export function applyScaleCalibration(
  floor: FloorModel,
  firstPoint: PointMeters,
  secondPoint: PointMeters,
  realDistanceMeters: number,
): boolean {
  const measuredDistance = distanceMeters(firstPoint, secondPoint)
  const currentMetersPerPixel = floor.scale.metersPerPixel
  const nextMetersPerPixel = calibrateMetersPerPixel(currentMetersPerPixel, measuredDistance, realDistanceMeters)
  if (nextMetersPerPixel <= 0 || nextMetersPerPixel === currentMetersPerPixel) {
    return false
  }

  const ratio = nextMetersPerPixel / currentMetersPerPixel
  floor.scale.metersPerPixel = nextMetersPerPixel

  if (floor.planImage) {
    floor.planImage.position.x *= ratio
    floor.planImage.position.y *= ratio
  }

  for (const room of floor.rooms) {
    room.points = room.points.map((point) => ({ x: point.x * ratio, y: point.y * ratio }))
    room.areaSqm = computePolygonAreaSqm(room.points)
  }

  for (const furniture of floor.furnitures) {
    furniture.position.x *= ratio
    furniture.position.y *= ratio
    furniture.widthMeters *= ratio
    furniture.depthMeters *= ratio
  }

  return true
}

export function createFurnitureTemplate(
  floor: FloorModel,
  roomId: string | null,
  position: PointMeters = { x: 0, y: 0 },
): FurnitureModel {
  return {
    id: createId('furniture'),
    label: `Furniture ${floor.furnitures.length + 1}`,
    fillColor: DEFAULT_FURNITURE_FILL_COLOR,
    position: { x: position.x, y: position.y },
    widthMeters: 1,
    depthMeters: 0.6,
    rotationDeg: 0,
    roomId,
    opacity: 1,
    locked: false,
    visible: true,
  }
}

/**
 * Clones furniture data into a plain object so clipboard operations avoid proxy cloning errors.
 */
export function cloneFurnitureModel(furniture: FurnitureModel): FurnitureModel {
  return {
    id: furniture.id,
    label: furniture.label,
    fillColor: furniture.fillColor,
    position: {
      x: furniture.position.x,
      y: furniture.position.y,
    },
    widthMeters: furniture.widthMeters,
    depthMeters: furniture.depthMeters,
    rotationDeg: furniture.rotationDeg,
    roomId: furniture.roomId,
    opacity: furniture.opacity,
    locked: furniture.locked,
    visible: furniture.visible,
  }
}

/**
 * Duplicates a furniture model at a new position while preserving its editable appearance.
 */
export function duplicateFurniture(
  floor: FloorModel,
  sourceFurniture: FurnitureModel,
  nextPosition: PointMeters,
): FurnitureModel {
  const sourceRoomId = sourceFurniture.roomId
  const matchingRoomId =
    sourceRoomId && floor.rooms.some((room) => room.id === sourceRoomId) ? sourceRoomId : null
  const trimmedLabel = sourceFurniture.label.trim()
  const duplicatedLabel = trimmedLabel
    ? `${trimmedLabel}`
    : `Furniture ${floor.furnitures.length + 1}`

  return {
    id: createId('furniture'),
    label: duplicatedLabel,
    fillColor: sourceFurniture.fillColor,
    position: {
      x: nextPosition.x,
      y: nextPosition.y,
    },
    widthMeters: sourceFurniture.widthMeters,
    depthMeters: sourceFurniture.depthMeters,
    rotationDeg: sourceFurniture.rotationDeg,
    roomId: matchingRoomId,
    opacity: sourceFurniture.opacity,
    locked: false,
    visible: true,
  }
}

export function toggleLayerVisibility(floor: FloorModel, layerId: string): boolean | null {
  if (floor.planImage?.id === layerId) {
    floor.planImage.visible = !floor.planImage.visible
    return floor.planImage.visible
  }

  const room = floor.rooms.find((candidate) => candidate.id === layerId)
  if (room) {
    room.visible = !room.visible
    return room.visible
  }

  const furniture = floor.furnitures.find((candidate) => candidate.id === layerId)
  if (furniture) {
    furniture.visible = !furniture.visible
    return furniture.visible
  }

  return null
}

export function toggleLayerLock(floor: FloorModel, layerId: string): boolean | null {
  if (floor.planImage?.id === layerId) {
    floor.planImage.locked = !floor.planImage.locked
    return floor.planImage.locked
  }

  const room = floor.rooms.find((candidate) => candidate.id === layerId)
  if (room) {
    room.locked = !room.locked
    return room.locked
  }

  const furniture = floor.furnitures.find((candidate) => candidate.id === layerId)
  if (furniture) {
    furniture.locked = !furniture.locked
    return furniture.locked
  }

  return null
}

export function renameLayer(floor: FloorModel, layerId: string, nextName: string): boolean {
  if (!nextName.trim()) {
    return false
  }

  if (floor.id === layerId) {
    floor.name = nextName
    return true
  }

  if (floor.planImage?.id === layerId) {
    floor.planImage.name = nextName
    return true
  }

  const room = floor.rooms.find((candidate) => candidate.id === layerId)
  if (room) {
    room.name = nextName
    return true
  }

  const furniture = floor.furnitures.find((candidate) => candidate.id === layerId)
  if (furniture) {
    furniture.label = nextName
    return true
  }

  return false
}

/**
 * Deletes a layer while keeping furniture records valid when their parent room is removed.
 */
export function removeLayer(floor: FloorModel, layerId: string): boolean {
  if (floor.planImage?.id === layerId) {
    floor.planImage = null
    return true
  }

  const roomIndex = floor.rooms.findIndex((candidate) => candidate.id === layerId)
  if (roomIndex >= 0) {
    floor.rooms.splice(roomIndex, 1)
    for (const furniture of floor.furnitures) {
      if (furniture.roomId === layerId) {
        furniture.roomId = null
      }
    }
    return true
  }

  const furnitureIndex = floor.furnitures.findIndex((candidate) => candidate.id === layerId)
  if (furnitureIndex >= 0) {
    floor.furnitures.splice(furnitureIndex, 1)
    return true
  }

  return false
}

export function setLayerOpacity(floor: FloorModel, layerId: string, opacity: number): boolean {
  if (floor.planImage?.id === layerId) {
    floor.planImage.opacity = opacity
    return true
  }

  return false
}

export function setFurnitureFillColor(floor: FloorModel, furnitureId: string, fillColor: string): boolean {
  const furniture = floor.furnitures.find((candidate) => candidate.id === furnitureId)
  if (!furniture) {
    return false
  }

  furniture.fillColor = normalizeFurnitureFillColor(fillColor)
  return true
}

export interface FurnitureMutationResult {
  depthMeters: number
  position: PointMeters
  roomId: string | null
  rotationDeg: number
  widthMeters: number
}

export function applyFurnitureTransform(
  floor: FloorModel,
  targetObject: EngineFabricObject,
): FurnitureMutationResult | null {
  if (!targetObject.sqaleId) {
    return null
  }

  const furniture = floor.furnitures.find((candidate) => candidate.id === targetObject.sqaleId)
  if (!furniture) {
    return null
  }

  furniture.widthMeters = (targetObject.width ?? furniture.widthMeters) * (targetObject.scaleX ?? 1)
  furniture.depthMeters = (targetObject.height ?? furniture.depthMeters) * (targetObject.scaleY ?? 1)
  furniture.position = { x: targetObject.left ?? 0, y: targetObject.top ?? 0 }
  furniture.rotationDeg = targetObject.angle ?? 0

  if (floor.grid.snap) {
    const spacing = floor.grid.spacingMeters
    furniture.widthMeters = Math.max(spacing, snapValue(furniture.widthMeters, spacing))
    furniture.depthMeters = Math.max(spacing, snapValue(furniture.depthMeters, spacing))
    furniture.position.x = snapValue(furniture.position.x, spacing)
    furniture.position.y = snapValue(furniture.position.y, spacing)
  }

  furniture.roomId = findContainingRoomId(floor, furniture.position)

  return {
    widthMeters: furniture.widthMeters,
    depthMeters: furniture.depthMeters,
    position: furniture.position,
    rotationDeg: furniture.rotationDeg,
    roomId: furniture.roomId,
  }
}

function findContainingRoomId(floor: FloorModel, point: PointMeters): string | null {
  for (const room of floor.rooms) {
    if (isPointInsidePolygon(point, room.points)) {
      return room.id
    }
  }

  return null
}
