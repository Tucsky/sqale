/** @vitest-environment jsdom */
import { createApp, defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'

import type { LayerEditSnapshot } from '@/features/canvas/engine/canvasEngine'
import { MIN_CANVAS_OBJECT_SIZE_METERS, LayerType, MeasurementUnit } from '@/types/domain'

import ActionBar from './ActionBar.vue'

function createFurnitureLayerSnapshot(width: number, height: number): LayerEditSnapshot {
  return {
    id: 'furniture_test',
    type: LayerType.Furniture,
    name: 'Chair',
    visible: true,
    locked: false,
    fillColor: '#ffffff',
    x: 0,
    y: 0,
    width,
    height,
    surfaceSqm: width * height,
    opacity: 1,
  }
}

async function flushUpdates(cycles: number): Promise<void> {
  for (let index = 0; index < cycles; index += 1) {
    await nextTick()
  }
}

describe('ActionBar size editing', () => {
  let host: HTMLDivElement | null = null

  afterEach(() => {
    host?.remove()
    host = null
  })

  it('emits a single size update when typed value is clamped by selection update', async () => {
    const selectedLayer = ref<LayerEditSnapshot | null>(createFurnitureLayerSnapshot(0.05, 0.72))
    const sizeUpdates: Array<{ layerId: string; width: number; height: number }> = []

    host = document.createElement('div')
    document.body.append(host)

    const app = createApp(defineComponent({
      setup() {
        return () => h(ActionBar, {
          drawingRoom: false,
          roomDraftClosed: false,
          roomDraftAreaSqm: 0,
          calibrating: false,
          measuring: false,
          calibrationMode: null,
          measuredCalibrationDistance: 0,
          measuredDistance: 0,
          selectedLayer: selectedLayer.value,
          lengthUnit: MeasurementUnit.Centimeter,
          surfaceUnit: MeasurementUnit.Meter,
          onApplySelectedSize: (payload: { layerId: string; width: number; height: number }) => {
            sizeUpdates.push(payload)
            const currentLayer = selectedLayer.value
            if (!currentLayer || currentLayer.id !== payload.layerId) {
              return
            }

            selectedLayer.value = {
              ...currentLayer,
              width: Math.max(MIN_CANVAS_OBJECT_SIZE_METERS, payload.width),
              height: Math.max(MIN_CANVAS_OBJECT_SIZE_METERS, payload.height),
            }
          },
        })
      },
    }))

    app.mount(host)
    await flushUpdates(2)

    const widthInput = host.querySelector('input')
    expect(widthInput).not.toBeNull()
    if (!widthInput) {
      app.unmount()
      return
    }

    widthInput.value = '1'
    widthInput.dispatchEvent(new Event('input', { bubbles: true }))
    await flushUpdates(4)

    expect(sizeUpdates).toHaveLength(1)
    expect(sizeUpdates[0]).toMatchObject({
      layerId: 'furniture_test',
      width: 0.01,
      height: 0.72,
    })

    app.unmount()
  })
})
