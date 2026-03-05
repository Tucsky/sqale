<script setup lang="ts">
import { ref } from 'vue'
import { Box, Grid3X3, Image, RotateCcw, RotateCw, Ruler, Square, Target } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { GRID_SPACING_OPTIONS, type GridSpacing } from '@/types/domain'

const props = defineProps<{
  drawingRoom: boolean
  calibrating: boolean
  hasPlanImage: boolean
  gridVisible: boolean
  gridSpacing: GridSpacing
  gridSnap: boolean
  planOpacity: number
}>()

const emit = defineEmits<{
  uploadPlan: [file: File]
  toggleRoomDrawing: []
  finishRoom: []
  addFurniture: []
  startCalibration: []
  setGridVisible: [value: boolean]
  setGridSpacing: [value: GridSpacing]
  setGridSnap: [value: boolean]
  rotatePlan: [deltaDeg: number]
  setPlanOpacity: [value: number]
}>()

const fileInput = ref<HTMLInputElement | null>(null)

function openFilePicker(): void {
  fileInput.value?.click()
}

function handleFileSelection(event: Event): void {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) {
    return
  }

  emit('uploadPlan', file)
  target.value = ''
}
</script>

<template>
  <div class="pointer-events-none absolute left-4 top-20 z-20 w-72 space-y-2">
    <div class="pointer-events-auto rounded-xl border border-border bg-white/95 p-3 shadow-panel backdrop-blur">
      <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tools</div>
      <div class="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" @click="openFilePicker">
          <Image class="h-4 w-4" />
          Upload plan
        </Button>

        <Button size="sm" :variant="props.drawingRoom ? 'default' : 'secondary'" @click="emit('toggleRoomDrawing')">
          <Square class="h-4 w-4" />
          {{ props.drawingRoom ? 'Cancel room' : 'Draw room' }}
        </Button>

        <Button size="sm" variant="secondary" :disabled="!props.drawingRoom" @click="emit('finishRoom')">
          <Target class="h-4 w-4" />
          Finish room
        </Button>

        <Button size="sm" variant="secondary" @click="emit('addFurniture')">
          <Box class="h-4 w-4" />
          Add furniture
        </Button>

        <Button size="sm" :variant="props.calibrating ? 'default' : 'secondary'" @click="emit('startCalibration')">
          <Ruler class="h-4 w-4" />
          {{ props.calibrating ? 'Pick 2 points' : 'Calibrate scale' }}
        </Button>
      </div>

      <input ref="fileInput" type="file" accept="image/png,image/jpeg" class="hidden" @change="handleFileSelection" />
    </div>

    <div class="pointer-events-auto rounded-xl border border-border bg-white/95 p-3 shadow-panel backdrop-blur">
      <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Grid</div>
      <div class="space-y-2">
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" :checked="props.gridVisible" @change="emit('setGridVisible', ($event.target as HTMLInputElement).checked)" />
          <Grid3X3 class="h-4 w-4" />
          Show grid
        </label>

        <label class="flex items-center gap-2 text-sm">
          Spacing
          <select
            class="h-8 rounded-md border border-input bg-white px-2 text-sm"
            :value="props.gridSpacing"
            @change="emit('setGridSpacing', Number(($event.target as HTMLSelectElement).value) as GridSpacing)"
          >
            <option v-for="spacing in GRID_SPACING_OPTIONS" :key="spacing" :value="spacing">{{ spacing }} m</option>
          </select>
        </label>

        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" :checked="props.gridSnap" @change="emit('setGridSnap', ($event.target as HTMLInputElement).checked)" />
          Snap to grid
        </label>
      </div>
    </div>

    <div v-if="props.hasPlanImage" class="pointer-events-auto rounded-xl border border-border bg-white/95 p-3 shadow-panel backdrop-blur">
      <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plan image</div>
      <div class="space-y-2">
        <div class="flex gap-2">
          <Button size="sm" variant="secondary" @click="emit('rotatePlan', -15)">
            <RotateCcw class="h-4 w-4" />
            -15°
          </Button>
          <Button size="sm" variant="secondary" @click="emit('rotatePlan', 15)">
            <RotateCw class="h-4 w-4" />
            +15°
          </Button>
        </div>

        <label class="block text-sm">
          Opacity {{ Math.round(props.planOpacity * 100) }}%
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            :value="props.planOpacity"
            class="h-6 w-full px-0"
            @input="emit('setPlanOpacity', Number(($event.target as HTMLInputElement).value))"
          />
        </label>
      </div>
    </div>
  </div>
</template>
