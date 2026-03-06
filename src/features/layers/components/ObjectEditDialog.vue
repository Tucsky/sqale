<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Edit3 } from 'lucide-vue-next'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { DEFAULT_FURNITURE_FILL_COLOR } from '@/features/furniture/model/furnitureColors'
import type { LayerEditSnapshot } from '@/features/canvas/engine/canvasEngine'
import { projectLayerSurfaceSqm } from '@/features/layers/model/layerEditing'
import {
  formatAreaInUnit,
  getAreaUnitLabel,
  getLengthInputMin,
  getLengthInputStep,
  getLengthUnitLabel,
  metersToUnit,
  normalizeLengthInputValue,
  unitToMeters,
} from '@/features/settings/model/measurementUnits'
import { LayerType, type MeasurementUnit } from '@/types/domain'

const props = defineProps<{
  open: boolean
  target: LayerEditSnapshot | null
  lengthUnit: MeasurementUnit
  surfaceUnit: MeasurementUnit
}>()

const emit = defineEmits<{
  close: []
  applyLabel: [payload: { layerId: string; name: string }]
  applyFrame: [payload: { layerId: string; x: number; y: number; width: number; height: number }]
  applyOpacity: [payload: { layerId: string; opacity: number }]
  applyColor: [payload: { layerId: string; fillColor: string }]
}>()

const labelValue = ref('')
const xValue = ref(0)
const yValue = ref(0)
const widthValue = ref(0)
const heightValue = ref(0)
const opacityValue = ref(1)
const fillColorValue = ref(DEFAULT_FURNITURE_FILL_COLOR)
const LENGTH_COMPARE_EPSILON = 1e-6
const editingFrameInput = ref(false)

/**
 * Keeps frame inputs aligned with selected layer values without interrupting active typing.
 */
function syncFrameValuesFromTarget(target: LayerEditSnapshot | null, lengthUnit: MeasurementUnit): void {
  if (!target || editingFrameInput.value) {
    return
  }

  const nextXValue = normalizeLengthInputValue(metersToUnit(target.x, lengthUnit), lengthUnit)
  const nextYValue = normalizeLengthInputValue(metersToUnit(target.y, lengthUnit), lengthUnit)
  const nextWidthValue = normalizeLengthInputValue(metersToUnit(target.width, lengthUnit), lengthUnit)
  const nextHeightValue = normalizeLengthInputValue(metersToUnit(target.height, lengthUnit), lengthUnit)
  if (
    Math.abs(nextXValue - xValue.value) <= LENGTH_COMPARE_EPSILON
    && Math.abs(nextYValue - yValue.value) <= LENGTH_COMPARE_EPSILON
    && Math.abs(nextWidthValue - widthValue.value) <= LENGTH_COMPARE_EPSILON
    && Math.abs(nextHeightValue - heightValue.value) <= LENGTH_COMPARE_EPSILON
  ) {
    return
  }

  xValue.value = nextXValue
  yValue.value = nextYValue
  widthValue.value = nextWidthValue
  heightValue.value = nextHeightValue
}

function handleFrameInputFocus(): void {
  editingFrameInput.value = true
}

function handleFrameInputBlur(): void {
  editingFrameInput.value = false
  syncFrameValuesFromTarget(props.target, props.lengthUnit)
}

watch(
  () => [props.open, props.target, props.lengthUnit] as const,
  ([isOpen, target, lengthUnit], previousState) => {
    const wasOpen = previousState?.[0] ?? false
    const previousTarget = previousState?.[1] ?? null
    if (!isOpen || !target) {
      editingFrameInput.value = false
      return
    }
    if (!wasOpen || target.id !== previousTarget?.id) {
      editingFrameInput.value = false
    }

    labelValue.value = target.name
    opacityValue.value = target.opacity
    fillColorValue.value = target.fillColor ?? DEFAULT_FURNITURE_FILL_COLOR
    syncFrameValuesFromTarget(target, lengthUnit)
  },
  { immediate: true },
)

const isPlanImage = computed(() => props.target?.type === LayerType.PlanImage)
const isFurniture = computed(() => props.target?.type === LayerType.Furniture)

const surfaceSqm = computed(() => {
  if (!props.target) {
    return 0
  }

  const widthMeters = unitToMeters(normalizeLengthInputValue(widthValue.value, props.lengthUnit), props.lengthUnit)
  const heightMeters = unitToMeters(normalizeLengthInputValue(heightValue.value, props.lengthUnit), props.lengthUnit)
  return projectLayerSurfaceSqm(props.target, widthMeters, heightMeters)
})
const lengthUnitLabel = computed(() => getLengthUnitLabel(props.lengthUnit))
const areaUnitLabel = computed(() => getAreaUnitLabel(props.surfaceUnit))
const lengthInputMin = computed(() => getLengthInputMin(props.lengthUnit))
const lengthInputStep = computed(() => getLengthInputStep(props.lengthUnit))

function handleOpacityUpdate(value: number[] | undefined): void {
  const nextOpacity = value?.[0]
  if (typeof nextOpacity !== 'number') {
    return
  }

  opacityValue.value = nextOpacity
}

watch(
  () => [props.open, props.target?.id, labelValue.value] as const,
  ([isOpen, targetId, name]) => {
    if (!isOpen || !targetId || !props.target) {
      return
    }
    if (!name || name === props.target.name) {
      return
    }

    emit('applyLabel', {
      layerId: targetId,
      name,
    })
  },
)

watch(
  () => [props.open, props.target?.id, xValue.value, yValue.value, widthValue.value, heightValue.value, props.lengthUnit] as const,
  ([isOpen, targetId, x, y, width, height, lengthUnit]) => {
    if (!isOpen || !targetId || !props.target) {
      return
    }
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) {
      return
    }

    const normalizedX = normalizeLengthInputValue(x, lengthUnit)
    const normalizedY = normalizeLengthInputValue(y, lengthUnit)
    const normalizedWidth = normalizeLengthInputValue(width, lengthUnit)
    const normalizedHeight = normalizeLengthInputValue(height, lengthUnit)
    const xMeters = unitToMeters(normalizedX, lengthUnit)
    const yMeters = unitToMeters(normalizedY, lengthUnit)
    const widthMeters = unitToMeters(normalizedWidth, lengthUnit)
    const heightMeters = unitToMeters(normalizedHeight, lengthUnit)
    if (
      Math.abs(xMeters - props.target.x) <= LENGTH_COMPARE_EPSILON
      && Math.abs(yMeters - props.target.y) <= LENGTH_COMPARE_EPSILON
      && Math.abs(widthMeters - props.target.width) <= LENGTH_COMPARE_EPSILON
      && Math.abs(heightMeters - props.target.height) <= LENGTH_COMPARE_EPSILON
    ) {
      return
    }

    emit('applyFrame', {
      layerId: targetId,
      x: xMeters,
      y: yMeters,
      width: widthMeters,
      height: heightMeters,
    })
  },
)

watch(
  () => [props.open, props.target?.id, props.target?.type, opacityValue.value] as const,
  ([isOpen, targetId, targetType, opacity]) => {
    if (!isOpen || !targetId || targetType !== LayerType.PlanImage || !props.target) {
      return
    }
    if (!Number.isFinite(opacity) || opacity === props.target.opacity) {
      return
    }

    emit('applyOpacity', {
      layerId: targetId,
      opacity,
    })
  },
)

watch(
  () => [props.open, props.target?.id, props.target?.type, fillColorValue.value] as const,
  ([isOpen, targetId, targetType, fillColor]) => {
    if (!isOpen || !targetId || targetType !== LayerType.Furniture || !props.target) {
      return
    }
    if (!fillColor || fillColor === props.target.fillColor) {
      return
    }

    emit('applyColor', {
      layerId: targetId,
      fillColor,
    })
  },
)

function handleLabelBlur(): void {
  if (!props.target) {
    return
  }

  const trimmedLabel = labelValue.value.trim()
  if (!trimmedLabel) {
    labelValue.value = props.target.name
    return
  }

  labelValue.value = trimmedLabel
}
</script>

<template>
  <Dialog :open="props.open" @update:open="(value) => !value && emit('close')">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Edit3 class="h-5 w-5" />
          Edit object
        </DialogTitle>
        <DialogDescription v-if="props.target">
          {{ props.target.name }}
        </DialogDescription>
      </DialogHeader>

      <div v-if="props.target" class="space-y-4">
        <label class="space-y-1 text-sm">
          <Label>Name</Label>
          <Input v-model="labelValue" @blur="handleLabelBlur" />
        </label>

        <section class="space-y-3 rounded-md border p-3">
          <div class="text-sm font-medium">Positioning and sizing</div>

          <div class="grid grid-cols-2 gap-3">
            <label class="space-y-1 text-sm">
              <Label>X ({{ lengthUnitLabel }})</Label>
              <Input v-model.number="xValue" type="number" :step="lengthInputStep" @focus="handleFrameInputFocus" @blur="handleFrameInputBlur" />
            </label>

            <label class="space-y-1 text-sm">
              <Label>Y ({{ lengthUnitLabel }})</Label>
              <Input v-model.number="yValue" type="number" :step="lengthInputStep" @focus="handleFrameInputFocus" @blur="handleFrameInputBlur" />
            </label>

            <label class="space-y-1 text-sm">
              <Label>Width ({{ lengthUnitLabel }})</Label>
              <Input
                v-model.number="widthValue"
                type="number"
                :min="lengthInputMin"
                :step="lengthInputStep"
                @focus="handleFrameInputFocus"
                @blur="handleFrameInputBlur"
              />
            </label>

            <label class="space-y-1 text-sm">
              <Label>Height ({{ lengthUnitLabel }})</Label>
              <Input
                v-model.number="heightValue"
                type="number"
                :min="lengthInputMin"
                :step="lengthInputStep"
                @focus="handleFrameInputFocus"
                @blur="handleFrameInputBlur"
              />
            </label>
          </div>

          <div class="text-sm text-muted-foreground">
            Calculated surface: {{ formatAreaInUnit(surfaceSqm, props.surfaceUnit) }} {{ areaUnitLabel }}
          </div>
        </section>

        <section v-if="isFurniture" class="space-y-3 rounded-md border p-3">
          <div class="text-sm font-medium">Color</div>
          <div class="flex items-center gap-3">
            <input
              v-model="fillColorValue"
              type="color"
              class="h-10 w-16 cursor-pointer rounded border border-input bg-background p-1"
            />
            <div class="text-sm text-muted-foreground">{{ fillColorValue.toUpperCase() }}</div>
          </div>
        </section>

        <section v-if="isPlanImage" class="space-y-3 rounded-md border p-3">
          <div class="text-sm font-medium">Transparency</div>
          <div class="space-y-2">
            <Slider :min="0.05" :max="1" :step="0.05" :model-value="[opacityValue]" @update:model-value="handleOpacityUpdate" />
            <div class="text-sm text-muted-foreground">{{ Math.round(opacityValue * 100) }}%</div>
          </div>
        </section>
      </div>
    </DialogContent>
  </Dialog>
</template>
