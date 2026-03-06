<script setup lang="ts">
import { ref } from 'vue'
import { Box, Image, Menu, Ruler, Settings, Square, Layers, SplinePointer, SquareMousePointer } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Menubar } from '@/components/ui/menubar'
import { ScaleCalibrationMode } from '@/types/domain'

const props = defineProps<{
  drawingRoom: boolean
  calibrating: boolean
}>()

const emit = defineEmits<{
  uploadPlan: [file: File]
  toggleRoomDrawing: []
  addFurniture: []
  startCalibration: [mode: (typeof ScaleCalibrationMode)[keyof typeof ScaleCalibrationMode]]
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
</script>

<template>
  <div class="pointer-events-none absolute left-4 top-4 z-30">
    <Menubar class="pointer-events-auto h-auto gap-1 p-1">
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button size="sm" variant="outline">
            <Menu class="h-4 w-4" />
            Menu
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="w-32">
          <DropdownMenuItem @select="emit('openSettings')" class="cursor-pointer">
            <Settings class="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem @select="emit('openFloors')" class="cursor-pointer">
            <Layers class="mr-2 h-4 w-4" />
            Floors
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button size="sm" variant="ghost" @click="openFilePicker">
        <Image class="h-4 w-4" />
        Upload plan
      </Button>

      <Button size="sm" :variant="props.drawingRoom ? 'default' : 'ghost'" @click="emit('toggleRoomDrawing')">
        <Square class="h-4 w-4" />
        {{ props.drawingRoom ? 'Cancel room' : 'Draw room' }}
      </Button>

      <Button size="sm" variant="ghost" @click="emit('addFurniture')">
        <Box class="h-4 w-4" />
        Add furniture
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button size="sm" :variant="props.calibrating ? 'default' : 'ghost'">
            <Ruler class="h-4 w-4" />
            Calibrate scale
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="w-52">
          <DropdownMenuItem @select="emit('startCalibration', ScaleCalibrationMode.TwoPoint)" class="cursor-pointer">
            <SplinePointer class="mr-2 h-4 w-4"></SplinePointer>
            Two-point calibration
          </DropdownMenuItem>
          <DropdownMenuItem @select="emit('startCalibration', ScaleCalibrationMode.Surface)" class="cursor-pointer">
            <SquareMousePointer class="mr-2 h-4 w-4"></SquareMousePointer>
            Surface calibration
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Menubar>

    <input ref="fileInput" type="file" accept="image/png,image/jpeg" class="hidden" @change="handleFileSelection" />
  </div>
</template>
