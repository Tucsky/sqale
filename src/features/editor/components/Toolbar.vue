<script setup lang="ts">
import { ref } from 'vue'
import {
  Box,
  Image,
  Layers,
  Menu,
  Plus,
  Ruler,
  Settings,
  SplinePointer,
  Square,
  SquareMousePointer,
  Trash2,
  DraftingCompass,
} from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Menubar } from '@/components/ui/menubar'
import { formatLengthInUnit, getLengthUnitLabel } from '@/features/settings/model/measurementUnits'
import { ScaleCalibrationMode, type FurniturePresetModel, type MeasurementUnit } from '@/types/domain'

const props = defineProps<{
  drawingRoom: boolean
  calibrating: boolean
  measuring: boolean
  furniturePresets: FurniturePresetModel[]
  lengthUnit: MeasurementUnit
}>()

const emit = defineEmits<{
  uploadPlan: [file: File]
  toggleRoomDrawing: []
  addFurniture: []
  addFurnitureFromPreset: [presetId: string]
  deleteFurniturePreset: [presetId: string]
  startCalibration: [mode: (typeof ScaleCalibrationMode)[keyof typeof ScaleCalibrationMode]]
  toggleMeasure: []
  openSettings: []
  openFloors: []
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

function formatPresetSize(widthMeters: number, depthMeters: number): string {
  const width = +formatLengthInUnit(widthMeters, props.lengthUnit)
  const depth = +formatLengthInUnit(depthMeters, props.lengthUnit)
  return `${width} x ${depth} ${getLengthUnitLabel(props.lengthUnit)}`
}
</script>

<template>
  <div
    class="pointer-events-none absolute left-3 top-3 z-30 sm:left-4 sm:top-4"
  >
    <Menubar
      class="pointer-events-auto h-auto flex-col items-stretch gap-1 overflow-y-auto p-1 sm:w-auto sm:flex-row sm:items-center sm:overflow-visible"
    >
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button size="sm" variant="outline" class="sm:justify-center px-2 sm:px-3">
            <Menu class="h-4 w-4" />
            <span class="hidden sm:inline">Menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="w-28">
          <DropdownMenuItem @select="emit('openSettings')" class="cursor-pointer">
            <Settings class="mr-1 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem @select="emit('openFloors')" class="cursor-pointer">
            <Layers class="mr-1 h-4 w-4" />
            Floors
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button size="sm" variant="ghost" class="px-2 sm:px-3" @click="openFilePicker">
        <Image class="h-4 w-4" />
        <span class="hidden sm:inline">Upload</span>
      </Button>

      <Button
        size="sm"
        :variant="props.drawingRoom ? 'default' : 'ghost'"
        class="px-2 sm:px-3"
        @click="emit('toggleRoomDrawing')"
      >
        <Square class="h-4 w-4" />
        <span class="hidden sm:inline">{{ props.drawingRoom ? 'Cancel room' : 'Room' }}</span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button size="sm" variant="ghost" class="px-2 sm:px-3">
            <Box class="h-4 w-4" />
            <span class="hidden sm:inline">Furniture</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="w-64">
          <DropdownMenuItem @select="emit('addFurniture')" class="cursor-pointer">
            <Plus class="h-4 w-4" />
            Furniture
          </DropdownMenuItem>

          <DropdownMenuItem
            v-for="preset in props.furniturePresets"
            :key="preset.id"
            @select="emit('addFurnitureFromPreset', preset.id)"
            class="cursor-pointer"
          >
            <span class="inline-block h-3 w-3 rounded-full" :style="{ backgroundColor: preset.fillColor }" />
            <span class="min-w-0 flex-1 truncate">{{ preset.name }}</span>
            <span class="text-xs text-muted-foreground">{{ formatPresetSize(preset.widthMeters, preset.depthMeters) }}</span>
            <button
              type="button"
              class="ml-auto inline-flex h-6 w-6 items-center justify-center rounded text-destructive hover:bg-destructive/10"
              @pointerdown.stop
              @pointerup.stop
              @mousedown.stop
              @mouseup.stop
              @click.stop.prevent="emit('deleteFurniturePreset', preset.id)"
            >
              <Trash2 class="h-3.5 w-3.5" />
            </button>
          </DropdownMenuItem>
          <DropdownMenuItem v-if="props.furniturePresets.length === 0" disabled>
            No presets available
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            size="sm"
            :variant="props.calibrating ? 'default' : 'ghost'"
            class="px-2 sm:px-3"
          >
            <DraftingCompass class="h-4 w-4" />
            <span class="hidden sm:inline">Calibrate</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="w-48">
          <DropdownMenuItem @select="emit('startCalibration', ScaleCalibrationMode.TwoPoint)" class="cursor-pointer">
            <SplinePointer class="mr-1 h-4 w-4"></SplinePointer>
            Two-point calibration
          </DropdownMenuItem>
          <DropdownMenuItem @select="emit('startCalibration', ScaleCalibrationMode.Surface)" class="cursor-pointer">
            <SquareMousePointer class="mr-1 h-4 w-4"></SquareMousePointer>
            Surface calibration
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        size="sm"
        :variant="props.measuring ? 'default' : 'ghost'"
        class="px-2 sm:px-3"
        @click="emit('toggleMeasure')"
      >
        <Ruler class="h-4 w-4" />
        <span class="hidden sm:inline">{{ props.measuring ? 'Cancel measure' : 'Measure' }}</span>
      </Button>
    </Menubar>

    <input ref="fileInput" type="file" accept="image/png,image/jpeg" class="hidden" @change="handleFileSelection" />
  </div>
</template>
