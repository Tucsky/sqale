import { describe, expect, it } from 'vitest'

import { panViewport } from '@/features/canvas/engine/viewport'

interface TestViewportCanvas {
  viewportTransform: number[] | null
  setViewportTransform: (nextViewportTransform: number[]) => void
}

function createCanvasFixture(initialViewportTransform: number[] | null): TestViewportCanvas {
  return {
    viewportTransform: initialViewportTransform,
    setViewportTransform(nextViewportTransform: number[]): void {
      this.viewportTransform = nextViewportTransform
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
