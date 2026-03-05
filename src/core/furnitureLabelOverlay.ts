import { fabric } from 'fabric'

import type { EngineFabricObject } from '@/core/canvasObjects'
import type { FurnitureModel } from '@/types/domain'

const LABEL_FONT = '600 12px ui-sans-serif, system-ui, sans-serif'
const LABEL_FILL_COLOR = 'rgba(15, 23, 42, 0.9)'
const LABEL_STROKE_COLOR = 'rgba(255, 255, 255, 0.75)'
const LABEL_STROKE_WIDTH = 3
const LABEL_PADDING_PX = 8
const MIN_LABEL_WIDTH_PX = 20

/**
 * Draws furniture labels on the overlay context so labels stay crisp while zooming.
 */
export function drawFurnitureLabelOverlay(
  canvas: fabric.Canvas,
  furnitures: FurnitureModel[],
  objectById: Map<string, EngineFabricObject>,
): void {
  const viewportTransform = canvas.viewportTransform
  if (!viewportTransform || furnitures.length === 0) {
    return
  }

  const zoom = canvas.getZoom()
  const translateX = viewportTransform[4] ?? 0
  const translateY = viewportTransform[5] ?? 0
  const overlayContext = canvas.getContext()

  overlayContext.save()
  overlayContext.textAlign = 'center'
  overlayContext.textBaseline = 'middle'
  overlayContext.font = LABEL_FONT
  overlayContext.fillStyle = LABEL_FILL_COLOR
  overlayContext.strokeStyle = LABEL_STROKE_COLOR
  overlayContext.lineWidth = LABEL_STROKE_WIDTH

  for (const furniture of furnitures) {
    const sceneObject = objectById.get(furniture.id)
    if (!sceneObject || sceneObject.visible === false || furniture.label.length === 0) {
      continue
    }

    const centerPoint = sceneObject.getCenterPoint()
    const maxLabelWidthPx = Math.max(MIN_LABEL_WIDTH_PX, sceneObject.getScaledWidth() * zoom - LABEL_PADDING_PX)
    const objectAngleRadians = ((sceneObject.angle ?? 0) * Math.PI) / 180

    overlayContext.save()
    overlayContext.translate(centerPoint.x * zoom + translateX, centerPoint.y * zoom + translateY)
    overlayContext.rotate(objectAngleRadians)
    overlayContext.strokeText(furniture.label, 0, 0, maxLabelWidthPx)
    overlayContext.fillText(furniture.label, 0, 0, maxLabelWidthPx)
    overlayContext.restore()
  }

  overlayContext.restore()
}
