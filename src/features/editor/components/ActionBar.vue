<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, Ruler, Square, StretchHorizontal, X } from 'lucide-vue-next'

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
  <div
    v-if="props.calibrating || props.measuring || props.drawingRoom || showSelectionAction"
    class="absolute bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-1/2 z-20 -translate-x-1/2 px-3 sm:px-0"
  >
    <div class="flex items-center gap-3 rounded-lg border bg-background/95 px-4 py-3 shadow-panel backdrop-blur">
      <template v-if="props.calibrating">
        <Ruler class="h-4 w-4 text-muted-foreground shrink-0" />
        <span class="text-sm text-muted-foreground">
          <template v-if="props.calibrationMode === ScaleCalibrationMode.TwoPoint">
            <template v-if="props.measuredCalibrationDistance <= 0">Click two points to calibrate.</template>
            <template v-else>
              <strong class="text-foreground">{{ formatLengthInUnit(props.measuredCalibrationDistance, props.lengthUnit) }} {{ lengthUnitLabel }}</strong>: Confirm or adjust points.
            </template>
          </template>
          <template v-else>
            <template v-if="!props.roomDraftClosed">Draw a surface to calibrate.</template>
            <template v-else>
              <strong class="text-foreground">{{ formatAreaInUnit(props.roomDraftAreaSqm, props.surfaceUnit) }} {{ areaUnitLabel }}</strong>: Confirm or adjust polygon.
            </template>
          </template>
        </span>
        <Button
          v-if="(props.calibrationMode === ScaleCalibrationMode.TwoPoint && props.measuredCalibrationDistance > 0)
            || (props.calibrationMode === ScaleCalibrationMode.Surface && props.roomDraftClosed && props.roomDraftAreaSqm > 0)"
          size="sm"
          @click="emit('confirmCalibration')"
          class="px-2 sm:px-3"
        >
          <Check></Check>
          <span class="hidden sm:inline">{{ props.calibrationMode === ScaleCalibrationMode.TwoPoint ? 'Confirm points' : 'Confirm surface' }}</span>
        </Button>
        <Button size="sm" variant="secondary" @click="emit('cancelCalibration')" class="px-2 sm:px-3">
          <X></X>
          <span class="hidden sm:inline">Cancel</span>
        </Button>
      </template>

      <template v-else-if="props.measuring">
        <Ruler class="h-4 w-4 text-muted-foreground shrink-0" />
        <span class="text-sm text-muted-foreground">
          <template v-if="props.measuredDistance <= 0">Click two points to measure.</template>
          <template v-else>
            Distance: <strong class="text-foreground">{{ formatLengthInUnit(props.measuredDistance, props.lengthUnit) }} {{ lengthUnitLabel }}</strong>
          </template>
        </span>
        <Button size="sm" variant="secondary" @click="emit('cancelMeasure')" class="px-2 sm:px-3">
          <X class="sm:hidden"></X>
          <span class="hidden sm:inline">Done</span>
        </Button>
      </template>

      <template v-else-if="props.drawingRoom">
        <Square class="h-4 w-4 text-muted-foreground shrink-0" />
        <div class="flex flex-col">
          <span class="text-sm text-muted-foreground">Close polygon to finish.</span>
          <span v-if="props.roomDraftClosed" class="text-xs text-muted-foreground">
            Current surface: {{ formatAreaInUnit(props.roomDraftAreaSqm, props.surfaceUnit) }} {{ areaUnitLabel }}
          </span>
        </div>
        <Button size="sm" @click="emit('finishRoom')" class="px-2 sm:px-3">
          <Check></Check>
          <span class="hidden sm:inline">Finish room</span>
        </Button>
        <Button size="sm" variant="secondary" @click="emit('cancelRoomDrawing')" class="px-2 sm:px-3">
          <X></X>
          <span class="hidden sm:inline">Cancel</span>
        </Button>
      </template>

      <template v-else-if="props.selectedLayer">
        <StretchHorizontal class="h-4 w-4 text-muted-foreground shrink-0" />
        <span class="text-sm font-medium">{{ props.selectedLayer.name }}</span>
        <Input
          v-model.lazy.number="widthValue"
          type="number"
          :min="lengthInputMin"
          :step="lengthInputStep"
          class="h-8 w-16 px-2"
        />
        ×
        <Input
          v-model.lazy.number="heightValue"
          type="number"
          :min="lengthInputMin"
          :step="lengthInputStep"
          class="h-8 w-16 px-2"
        />
        <span class="text-sm text-muted-foreground">Surface {{ formatAreaInUnit(selectedSurface, props.surfaceUnit) }} {{ areaUnitLabel }}</span>
      </template>
    </div>
  </div>
</template>
<style lang="css" scoped>
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
