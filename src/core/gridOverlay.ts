import { fabric } from 'fabric'

export function drawGridOverlay(canvas: fabric.Canvas, spacingMeters: number): void {
  const viewportTransform = canvas.viewportTransform
  if (!viewportTransform) {
    return
  }

  const canvasContext = canvas.getContext()
  const zoom = canvas.getZoom()

  const translateX = viewportTransform[4] ?? 0
  const translateY = viewportTransform[5] ?? 0

  const leftWorld = -translateX / zoom
  const topWorld = -translateY / zoom
  const rightWorld = leftWorld + canvas.getWidth() / zoom
  const bottomWorld = topWorld + canvas.getHeight() / zoom

  const firstVertical = Math.floor(leftWorld / spacingMeters) * spacingMeters
  const firstHorizontal = Math.floor(topWorld / spacingMeters) * spacingMeters

  canvasContext.save()
  canvasContext.strokeStyle = 'rgba(15, 23, 42, 0.14)'
  canvasContext.lineWidth = 1

  for (let gridX = firstVertical; gridX <= rightWorld; gridX += spacingMeters) {
    const screenX = gridX * zoom + translateX
    canvasContext.beginPath()
    canvasContext.moveTo(screenX, 0)
    canvasContext.lineTo(screenX, canvas.getHeight())
    canvasContext.stroke()
  }

  for (let gridY = firstHorizontal; gridY <= bottomWorld; gridY += spacingMeters) {
    const screenY = gridY * zoom + translateY
    canvasContext.beginPath()
    canvasContext.moveTo(0, screenY)
    canvasContext.lineTo(canvas.getWidth(), screenY)
    canvasContext.stroke()
  }

  canvasContext.restore()
}
