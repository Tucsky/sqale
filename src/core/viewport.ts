import { fabric } from 'fabric'

import { clamp } from '@/lib/utils'

export interface ViewportPointer {
  x: number
  y: number
}

const ZOOM_STEP_MULTIPLIER = 0.995
const MIN_ZOOM = 0.1
const MAX_ZOOM = 320

export function zoomFromWheel(canvas: fabric.Canvas, pointer: ViewportPointer, wheelDeltaY: number): void {
  const currentZoom = canvas.getZoom()
  const nextZoom = clamp(currentZoom * ZOOM_STEP_MULTIPLIER ** wheelDeltaY, MIN_ZOOM, MAX_ZOOM)
  canvas.zoomToPoint(new fabric.Point(pointer.x, pointer.y), nextZoom)
}

export function panViewport(canvas: fabric.Canvas, deltaX: number, deltaY: number): void {
  const viewportTransform = canvas.viewportTransform
  if (!viewportTransform) {
    return
  }

  const nextViewportTransform = [...viewportTransform]
  const translateX = nextViewportTransform[4] ?? 0
  const translateY = nextViewportTransform[5] ?? 0

  nextViewportTransform[4] = translateX + deltaX
  nextViewportTransform[5] = translateY + deltaY

  canvas.setViewportTransform(nextViewportTransform as number[])
}
