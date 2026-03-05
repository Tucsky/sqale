<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Ruler, Square, StretchHorizontal } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { LayerEditSnapshot } from '@/core/canvasEngine'
import { projectLayerSurfaceSqm } from '@/core/layerEditing'

const props = defineProps<{
  drawingRoom: boolean
  roomDraftClosed: boolean
  roomDraftAreaSqm: number
  calibrating: boolean
  measuredCalibrationDistance: number
  selectedLayer: LayerEditSnapshot | null
}>()

const emit = defineEmits<{
  finishRoom: []
  cancelRoomDrawing: []
  confirmCalibration: []
  cancelCalibration: []
  applySelectedSize: [payload: { layerId: string; width: number; height: number }]
}>()

const widthValue = ref(0)
const heightValue = ref(0)

watch(
  () => props.selectedLayer,
  (selectedLayer) => {
    if (!selectedLayer) {
      return
    }

    widthValue.value = selectedLayer.width
    heightValue.value = selectedLayer.height
  },
  { immediate: true },
)
watch(
  () => [props.selectedLayer?.id, widthValue.value, heightValue.value] as const,
  ([layerId, width, height]) => {
    if (!layerId || !props.selectedLayer) {
      return
    }
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      return
    }
    if (width === props.selectedLayer.width && height === props.selectedLayer.height) {
      return
    }

    emit('applySelectedSize', {
      layerId,
      width,
      height,
    })
  },
)

const selectedSurface = computed(() => {
  if (!props.selectedLayer) {
    return 0
  }

  return projectLayerSurfaceSqm(props.selectedLayer, widthValue.value, heightValue.value)
})
const showSelectionAction = computed(() => !props.calibrating && !props.drawingRoom && Boolean(props.selectedLayer))
</script>

<template>
  <div v-if="props.calibrating || props.drawingRoom || showSelectionAction" class="absolute bottom-6 left-1/2 z-20 -translate-x-1/2">
    <div class="flex items-center gap-3 rounded-lg border bg-background/95 px-4 py-3 shadow-panel backdrop-blur">
      <template v-if="props.calibrating">
        <Ruler class="h-4 w-4 text-muted-foreground" />
        <span class="text-sm text-muted-foreground">
          <template v-if="props.measuredCalibrationDistance <= 0">Calibration in progress: click two points on the plan.</template>
          <template v-else>
            Calibration points set ({{ props.measuredCalibrationDistance.toFixed(2) }} m). Confirm or adjust points.
          </template>
        </span>
        <Button v-if="props.measuredCalibrationDistance > 0" size="sm" @click="emit('confirmCalibration')">Confirm points</Button>
        <Button size="sm" variant="secondary" @click="emit('cancelCalibration')">Cancel</Button>
      </template>

      <template v-else-if="props.drawingRoom">
        <Square class="h-4 w-4 text-muted-foreground" />
        <div class="flex flex-col">
          <span class="text-sm text-muted-foreground">Room drawing in progress. Close the polygon and finish when ready.</span>
          <span v-if="props.roomDraftClosed" class="text-xs text-muted-foreground">
            Current surface: {{ props.roomDraftAreaSqm.toFixed(2) }} m²
          </span>
        </div>
        <Button size="sm" @click="emit('finishRoom')">Finish room</Button>
        <Button size="sm" variant="secondary" @click="emit('cancelRoomDrawing')">Cancel</Button>
      </template>

      <template v-else-if="props.selectedLayer">
        <StretchHorizontal class="h-4 w-4 text-muted-foreground" />
        <span class="text-sm font-medium">{{ props.selectedLayer.name }}</span>
        <label class="flex items-center gap-2 text-sm">
          W
          <Input v-model.number="widthValue" type="number" min="0.05" step="0.01" class="h-8 w-24" />
        </label>
        <label class="flex items-center gap-2 text-sm">
          H
          <Input v-model.number="heightValue" type="number" min="0.05" step="0.01" class="h-8 w-24" />
        </label>
        <span class="text-sm text-muted-foreground">Surface {{ selectedSurface.toFixed(2) }} m²</span>
      </template>
    </div>
  </div>
</template>
