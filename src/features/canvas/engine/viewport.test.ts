import { describe, expect, it } from 'vitest'

import { panViewport, zoomFromPinch } from '@/features/canvas/engine/viewport'

interface TestViewportCanvas {
  viewportTransform: number[] | null
  zoom: number
  setViewportTransform: (nextViewportTransform: number[]) => void
  getZoom: () => number
  zoomToPoint: (_point: unknown, nextZoom: number) => void
}

function createCanvasFixture(initialViewportTransform: number[] | null): TestViewportCanvas {
  return {
    viewportTransform: initialViewportTransform,
    zoom: 1,
    setViewportTransform(nextViewportTransform: number[]): void {
      this.viewportTransform = nextViewportTransform
    },
    getZoom(): number {
      return this.zoom
    },
    zoomToPoint(_point: unknown, nextZoom: number): void {
      this.zoom = nextZoom
    },
  }
}

describe('panViewport', () => {
  it('applies finite pan deltas to viewport translation', () => {
    const canvas = createCanvasFixture([1, 0, 0, 1, 12, 24])

    panViewport(canvas as unknown as Parameters<typeof panViewport>[0], 3, -5)

    expect(canvas.viewportTransform).toEqual([1, 0, 0, 1, 15, 19])
  })

  it('ignores non-finite pan deltas', () => {
    const canvas = createCanvasFixture([1, 0, 0, 1, 12, 24])

    panViewport(canvas as unknown as Parameters<typeof panViewport>[0], Number.NaN, 2)

    expect(canvas.viewportTransform).toEqual([1, 0, 0, 1, 12, 24])
  })

  it('recovers non-finite translation values before applying deltas', () => {
    const canvas = createCanvasFixture([1, 0, 0, 1, Number.NaN, Number.POSITIVE_INFINITY])

    panViewport(canvas as unknown as Parameters<typeof panViewport>[0], 5, 7)

    expect(canvas.viewportTransform).toEqual([1, 0, 0, 1, 5, 7])
  })
})

describe('zoomFromPinch', () => {
  it('scales zoom proportionally to pinch distance ratio', () => {
    const canvas = createCanvasFixture([1, 0, 0, 1, 0, 0])
    canvas.zoom = 2

    zoomFromPinch(canvas as unknown as Parameters<typeof zoomFromPinch>[0], { x: 20, y: 10 }, 100, 125)

    expect(canvas.zoom).toBe(2.5)
  })

  it('ignores non-finite pinch distances', () => {
    const canvas = createCanvasFixture([1, 0, 0, 1, 0, 0])
    canvas.zoom = 2

    zoomFromPinch(canvas as unknown as Parameters<typeof zoomFromPinch>[0], { x: 0, y: 0 }, Number.NaN, 120)

    expect(canvas.zoom).toBe(2)
  })
})
