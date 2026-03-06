import { describe, expect, it, vi } from 'vitest'

vi.mock('fabric', () => {
  class MockCanvas {
    private objects: Array<{ setCoords?: () => void }> = []

    constructor(_canvasElement: HTMLCanvasElement, _options: unknown) {}

    dispose(): void {}

    setWidth(_width: number): void {}

    setHeight(_height: number): void {}

    calcOffset(): void {}

    requestRenderAll(): void {}

    discardActiveObject(): void {}

    clear(): void {
      this.objects = []
    }

    add(canvasObject: { setCoords?: () => void }): void {
      this.objects.push(canvasObject)
    }

    getObjects(): Array<{ setCoords?: () => void }> {
      return this.objects
    }
  }

  return {
    fabric: {
      Canvas: MockCanvas,
    },
  }
})

import { CanvasEngineCore } from '@/features/canvas/engine/canvasEngineCore'
import { EngineMode, ScaleCalibrationMode, type FloorModel } from '@/types/domain'

class TestCanvasEngineCore extends CanvasEngineCore {
  getModeValue(): (typeof EngineMode)[keyof typeof EngineMode] {
    return this.mode
  }

  getCalibrationModeValue(): (typeof ScaleCalibrationMode)[keyof typeof ScaleCalibrationMode] {
    return this.scaleCalibrationMode
  }

  getDraftRoomPointsCount(): number {
    return this.draftRoomPoints.length
  }

  getCalibrationPointsCount(): number {
    return this.calibrationPoints.length
  }
}

const floorFixture: FloorModel = {
  id: 'floor_1',
  name: 'Floor 1',
  planImage: null,
  scale: { metersPerPixel: 0.01 },
  grid: { visible: true, spacingMeters: 0.5, snap: false },
  rooms: [],
  furnitures: [],
}

describe('canvasEngineCore loadFloor interaction reset', () => {
  it('resets draw-room mode when loading another floor', () => {
    const engine = new TestCanvasEngineCore({} as HTMLCanvasElement)
    engine.startRoomDrawing()

    engine.loadFloor(floorFixture)

    expect(engine.getModeValue()).toBe(EngineMode.Idle)
    expect(engine.getDraftRoomPointsCount()).toBe(0)
  })

  it('resets calibration mode and draft state when loading another floor', () => {
    const engine = new TestCanvasEngineCore({} as HTMLCanvasElement)
    engine.startCalibration(ScaleCalibrationMode.Surface)

    engine.loadFloor(floorFixture)

    expect(engine.getModeValue()).toBe(EngineMode.Idle)
    expect(engine.getCalibrationModeValue()).toBe(ScaleCalibrationMode.TwoPoint)
    expect(engine.getCalibrationPointsCount()).toBe(0)
    expect(engine.getDraftRoomPointsCount()).toBe(0)
  })
})
