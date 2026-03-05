import { fabric } from 'fabric'

import { clamp } from '@/lib/utils'

const MIN_FIT_ZOOM = 0.1
const MAX_FIT_ZOOM = 220

export function fitObjectInViewport(canvas: fabric.Canvas, object: fabric.Object): void {
  const objectWidth = object.getScaledWidth()
  const objectHeight = object.getScaledHeight()
  if (objectWidth <= 0 || objectHeight <= 0) {
    return
  }

  const canvasWidth = canvas.getWidth()
  const canvasHeight = canvas.getHeight()
  const fitPadding = 0.78

  const zoomX = (canvasWidth * fitPadding) / objectWidth
  const zoomY = (canvasHeight * fitPadding) / objectHeight
  const zoom = clamp(Math.min(zoomX, zoomY), MIN_FIT_ZOOM, MAX_FIT_ZOOM)

  const centerPoint = object.getCenterPoint()
  const translateX = canvasWidth * 0.5 - centerPoint.x * zoom
  const translateY = canvasHeight * 0.5 - centerPoint.y * zoom

  canvas.setViewportTransform([zoom, 0, 0, zoom, translateX, translateY])
  canvas.requestRenderAll()
}
