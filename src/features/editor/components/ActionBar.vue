<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Ruler, Square, StretchHorizontal } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { LayerEditSnapshot } from '@/features/canvas/engine/canvasEngine'
import { projectLayerSurfaceSqm } from '@/features/layers/model/layerEditing'
import {
  formatAreaInUnit,
  formatLengthInUnit,
  getAreaUnitLabel,
  getLengthInputMin,
  getLengthInputStep,
  getLengthUnitLabel,
  metersToUnit,
  normalizeLengthInputValue,
  unitToMeters,
} from '@/features/settings/model/measurementUnits'
import { ScaleCalibrationMode, type MeasurementUnit } from '@/types/domain'

const props = defineProps<{
  drawingRoom: boolean
  roomDraftClosed: boolean
  roomDraftAreaSqm: number
  calibrating: boolean
  measuring: boolean
  calibrationMode: (typeof ScaleCalibrationMode)[keyof typeof ScaleCalibrationMode] | null
  measuredCalibrationDistance: number
  measuredDistance: number
  selectedLayer: LayerEditSnapshot | null
  lengthUnit: MeasurementUnit
  surfaceUnit: MeasurementUnit
}>()

const emit = defineEmits<{
  finishRoom: []
  cancelRoomDrawing: []
  confirmCalibration: []
  cancelCalibration: []
  cancelMeasure: []
  applySelectedSize: [payload: { layerId: string; width: number; height: number }]
}>()

const widthValue = ref(0)
const heightValue = ref(0)
const LENGTH_COMPARE_EPSILON = 1e-6

watch(
  [
    () => props.selectedLayer?.width,
    () => props.selectedLayer?.height,
    () => props.lengthUnit,
  ],
  ([selectedWidth, selectedHeight, lengthUnit]) => {
    if (typeof selectedWidth !== 'number' || typeof selectedHeight !== 'number') {
      return
    }

    widthValue.value = normalizeLengthInputValue(metersToUnit(selectedWidth, lengthUnit), lengthUnit)
    heightValue.value = normalizeLengthInputValue(metersToUnit(selectedHeight, lengthUnit), lengthUnit)
  },
  { immediate: true },
)
watch(
  [
    () => props.selectedLayer?.id,
    widthValue,
    heightValue,
    () => props.lengthUnit,
  ],
  ([layerId, width, height, lengthUnit]) => {
    if (!layerId || !props.selectedLayer) {
      return
    }
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      return
    }

    const normalizedWidth = normalizeLengthInputValue(width, lengthUnit)
    const normalizedHeight = normalizeLengthInputValue(height, lengthUnit)
    const widthMeters = unitToMeters(normalizedWidth, lengthUnit)
    const heightMeters = unitToMeters(normalizedHeight, lengthUnit)
    if (
      Math.abs(widthMeters - props.selectedLayer.width) <= LENGTH_COMPARE_EPSILON
      && Math.abs(heightMeters - props.selectedLayer.height) <= LENGTH_COMPARE_EPSILON
    ) {
      return
    }

    emit('applySelectedSize', {
      layerId,
      width: widthMeters,
      height: heightMeters,
    })
  },
)

const selectedSurface = computed(() => {
  if (!props.selectedLayer) {
    return 0
  }

  const widthMeters = unitToMeters(normalizeLengthInputValue(widthValue.value, props.lengthUnit), props.lengthUnit)
  const heightMeters = unitToMeters(normalizeLengthInputValue(heightValue.value, props.lengthUnit), props.lengthUnit)
  return projectLayerSurfaceSqm(props.selectedLayer, widthMeters, heightMeters)
})
const lengthUnitLabel = computed(() => getLengthUnitLabel(props.lengthUnit))
const areaUnitLabel = computed(() => getAreaUnitLabel(props.surfaceUnit))
const lengthInputMin = computed(() => getLengthInputMin(props.lengthUnit))
const lengthInputStep = computed(() => getLengthInputStep(props.lengthUnit))
const showSelectionAction = computed(() => !props.calibrating && !props.measuring && !props.drawingRoom && Boolean(props.selectedLayer))
</script>

<template>
  <div v-if="props.calibrating || props.measuring || props.drawingRoom || showSelectionAction" class="absolute bottom-6 left-1/2 z-20 -translate-x-1/2">
    <div class="flex items-center gap-3 rounded-lg border bg-background/95 px-4 py-3 shadow-panel backdrop-blur">
      <template v-if="props.calibrating">
        <Ruler class="h-4 w-4 text-muted-foreground" />
        <span class="text-sm text-muted-foreground">
          <template v-if="props.calibrationMode === ScaleCalibrationMode.TwoPoint">
            <template v-if="props.measuredCalibrationDistance <= 0">Two-point calibration in progress: click two points on the plan.</template>
            <template v-else>
              Calibration points set ({{ formatLengthInUnit(props.measuredCalibrationDistance, props.lengthUnit) }} {{ lengthUnitLabel }}). Confirm or adjust points.
            </template>
          </template>
          <template v-else>
            <template v-if="!props.roomDraftClosed">Surface calibration in progress: draw and close the polygon on the plan.</template>
            <template v-else>
              Calibration surface set ({{ formatAreaInUnit(props.roomDraftAreaSqm, props.surfaceUnit) }} {{ areaUnitLabel }}). Confirm or adjust polygon.
            </template>
          </template>
        </span>
        <Button
          v-if="(props.calibrationMode === ScaleCalibrationMode.TwoPoint && props.measuredCalibrationDistance > 0)
            || (props.calibrationMode === ScaleCalibrationMode.Surface && props.roomDraftClosed && props.roomDraftAreaSqm > 0)"
          size="sm"
          @click="emit('confirmCalibration')"
        >
          {{ props.calibrationMode === ScaleCalibrationMode.TwoPoint ? 'Confirm points' : 'Confirm surface' }}
        </Button>
        <Button size="sm" variant="secondary" @click="emit('cancelCalibration')">Cancel</Button>
      </template>

      <template v-else-if="props.measuring">
        <Ruler class="h-4 w-4 text-muted-foreground" />
        <span class="text-sm text-muted-foreground">
          <template v-if="props.measuredDistance <= 0">Measure in progress: click two points on the plan.</template>
          <template v-else>
            Distance: {{ formatLengthInUnit(props.measuredDistance, props.lengthUnit) }} {{ lengthUnitLabel }}. Drag points to refine.
          </template>
        </span>
        <Button size="sm" variant="secondary" @click="emit('cancelMeasure')">Done</Button>
      </template>

      <template v-else-if="props.drawingRoom">
        <Square class="h-4 w-4 text-muted-foreground" />
        <div class="flex flex-col">
          <span class="text-sm text-muted-foreground">Room drawing in progress. Close the polygon and finish when ready.</span>
          <span v-if="props.roomDraftClosed" class="text-xs text-muted-foreground">
            Current surface: {{ formatAreaInUnit(props.roomDraftAreaSqm, props.surfaceUnit) }} {{ areaUnitLabel }}
          </span>
        </div>
        <Button size="sm" @click="emit('finishRoom')">Finish room</Button>
        <Button size="sm" variant="secondary" @click="emit('cancelRoomDrawing')">Cancel</Button>
      </template>

      <template v-else-if="props.selectedLayer">
        <StretchHorizontal class="h-4 w-4 text-muted-foreground shrink-0" />
        <span class="text-sm font-medium">{{ props.selectedLayer.name }}</span>
        <Input
          v-model.number="widthValue"
          type="text"
          :min="lengthInputMin"
          :step="lengthInputStep"
          class="h-8 w-16 px-2"
        />
        ×
        <Input
          v-model.number="heightValue"
          type="text"
          :min="lengthInputMin"
          :step="lengthInputStep"
          class="h-8 w-16 px-2"
        />
        <span class="text-sm text-muted-foreground">Surface {{ formatAreaInUnit(selectedSurface, props.surfaceUnit) }} {{ areaUnitLabel }}</span>
      </template>
    </div>
  </div>
</template>
