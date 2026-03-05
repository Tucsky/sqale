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
import { DEFAULT_FURNITURE_FILL_COLOR } from '@/core/furnitureColors'
import type { LayerEditSnapshot } from '@/core/canvasEngine'
import { projectLayerSurfaceSqm } from '@/core/layerEditing'
import { LayerType } from '@/types/domain'

const props = defineProps<{
  open: boolean
  target: LayerEditSnapshot | null
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

watch(
  () => [props.open, props.target] as const,
  ([isOpen, target]) => {
    if (!isOpen || !target) {
      return
    }

    labelValue.value = target.name
    xValue.value = target.x
    yValue.value = target.y
    widthValue.value = target.width
    heightValue.value = target.height
    opacityValue.value = target.opacity
    fillColorValue.value = target.fillColor ?? DEFAULT_FURNITURE_FILL_COLOR
  },
  { immediate: true },
)

const isPlanImage = computed(() => props.target?.type === LayerType.PlanImage)
const isFurniture = computed(() => props.target?.type === LayerType.Furniture)

const surfaceSqm = computed(() => {
  if (!props.target) {
    return 0
  }

  return projectLayerSurfaceSqm(props.target, widthValue.value, heightValue.value)
})

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
  () => [props.open, props.target?.id, xValue.value, yValue.value, widthValue.value, heightValue.value] as const,
  ([isOpen, targetId, x, y, width, height]) => {
    if (!isOpen || !targetId || !props.target) {
      return
    }
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) {
      return
    }
    if (x === props.target.x && y === props.target.y && width === props.target.width && height === props.target.height) {
      return
    }

    emit('applyFrame', {
      layerId: targetId,
      x,
      y,
      width,
      height,
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
              <Label>X</Label>
              <Input v-model.number="xValue" type="number" step="0.01" />
            </label>

            <label class="space-y-1 text-sm">
              <Label>Y</Label>
              <Input v-model.number="yValue" type="number" step="0.01" />
            </label>

            <label class="space-y-1 text-sm">
              <Label>Width</Label>
              <Input v-model.number="widthValue" type="number" min="0.05" step="0.01" />
            </label>

            <label class="space-y-1 text-sm">
              <Label>Height</Label>
              <Input v-model.number="heightValue" type="number" min="0.05" step="0.01" />
            </label>
          </div>

          <div class="text-sm text-muted-foreground">Calculated surface: {{ surfaceSqm.toFixed(2) }} m²</div>
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
