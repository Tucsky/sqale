<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import CanvasView from '@/components/CanvasView.vue'
import LayerPanel from '@/components/LayerPanel.vue'
import Toolbar from '@/components/Toolbar.vue'
import TopBar from '@/components/TopBar.vue'
import FloorsDialog from '@/components/dialogs/FloorsDialog.vue'
import ScaleDialog from '@/components/dialogs/ScaleDialog.vue'
import SettingsDialog from '@/components/dialogs/SettingsDialog.vue'
import { Button } from '@/components/ui/button'
import { CanvasEngine } from '@/core/canvasEngine'
import { cloneFloorModel } from '@/core/floorClone'
import { createId } from '@/lib/utils'
import {
  bootstrapFloorState,
  createEmptyFloor,
  deleteFloor,
  saveFloor,
  setCurrentFloorId,
} from '@/storage/db'
import type { FloorModel, LayerNode } from '@/types/domain'

const canvasEngine = ref<CanvasEngine | null>(null)

const floors = ref<FloorModel[]>([])
const currentFloor = ref<FloorModel | null>(null)
const currentFloorId = ref('')

const layerTree = ref<LayerNode | null>(null)
const selectedLayerId = ref<string | null>(null)

const layersOpen = ref(true)
const settingsOpen = ref(false)
const floorsOpen = ref(false)
const scaleDialogOpen = ref(false)

const measuredCalibrationDistance = ref(0)
const drawingRoom = ref(false)
const calibratingScale = ref(false)

let persistTimer: ReturnType<typeof setTimeout> | null = null
let pendingPersistFloor: FloorModel | null = null

const hasPlanImage = computed(() => Boolean(currentFloor.value?.planImage))
const gridVisible = computed(() => currentFloor.value?.grid.visible ?? false)
const gridSpacing = computed(() => currentFloor.value?.grid.spacingMeters ?? 0.5)
const gridSnap = computed(() => currentFloor.value?.grid.snap ?? false)
const metersPerPixel = computed(() => currentFloor.value?.scale.metersPerPixel ?? 0.01)
const planOpacity = computed(() => currentFloor.value?.planImage?.opacity ?? 1)

onMounted(async () => {
  const bootstrappedState = await bootstrapFloorState()
  floors.value = bootstrappedState.floors
  currentFloor.value = bootstrappedState.currentFloor
  currentFloorId.value = bootstrappedState.currentFloor.id

  if (canvasEngine.value) {
    canvasEngine.value.loadFloor(bootstrappedState.currentFloor)
  }
})

onBeforeUnmount(() => {
  if (persistTimer) {
    clearTimeout(persistTimer)
  }

  canvasEngine.value?.dispose()
})

function setupCanvasEngine(canvasElement: HTMLCanvasElement): void {
  if (canvasEngine.value) {
    canvasEngine.value.dispose()
  }

  canvasEngine.value = new CanvasEngine(canvasElement, {
    onFloorUpdated(nextFloor) {
      currentFloor.value = nextFloor
      upsertFloor(nextFloor)
      schedulePersist(nextFloor)
    },
    onLayerTreeChanged(nextLayerTree) {
      layerTree.value = nextLayerTree
    },
    onSelectionChanged(layerId) {
      selectedLayerId.value = layerId
    },
    onCalibrationMeasured(calibration) {
      measuredCalibrationDistance.value = calibration.measuredDistance
    },
  })

  if (currentFloor.value) {
    canvasEngine.value.loadFloor(currentFloor.value)
  }
}

function handleViewportResize(width: number, height: number): void {
  canvasEngine.value?.resize(width, height)
}

function upsertFloor(nextFloor: FloorModel): void {
  const existingIndex = floors.value.findIndex((floor) => floor.id === nextFloor.id)
  if (existingIndex >= 0) {
    floors.value.splice(existingIndex, 1, nextFloor)
    return
  }

  floors.value.push(nextFloor)
}

function schedulePersist(nextFloor: FloorModel): void {
  pendingPersistFloor = nextFloor
  if (persistTimer) {
    clearTimeout(persistTimer)
  }

  persistTimer = setTimeout(async () => {
    if (!pendingPersistFloor) {
      return
    }

    await saveFloor(pendingPersistFloor)
    pendingPersistFloor = null
  }, 220)
}

async function selectFloor(nextFloorId: string): Promise<void> {
  const nextFloor = floors.value.find((floor) => floor.id === nextFloorId)
  if (!nextFloor) {
    return
  }

  currentFloorId.value = nextFloorId
  currentFloor.value = cloneFloorModel(nextFloor)
  await setCurrentFloorId(nextFloorId)
  canvasEngine.value?.loadFloor(nextFloor)
  drawingRoom.value = false
  calibratingScale.value = false
  scaleDialogOpen.value = false
}

function toggleRoomDrawing(): void {
  if (!canvasEngine.value) {
    return
  }

  if (drawingRoom.value) {
    canvasEngine.value.cancelRoomDrawing()
    drawingRoom.value = false
    return
  }

  canvasEngine.value.startRoomDrawing()
  drawingRoom.value = true
  calibratingScale.value = false
}

function finishRoom(): void {
  if (!canvasEngine.value || !currentFloor.value) {
    return
  }

  const roomName = `Room ${currentFloor.value.rooms.length + 1}`
  canvasEngine.value.commitRoom(roomName)
  drawingRoom.value = false
}

function startScaleCalibration(): void {
  if (!canvasEngine.value) {
    return
  }

  if (calibratingScale.value) {
    canvasEngine.value.cancelCalibration()
    calibratingScale.value = false
    measuredCalibrationDistance.value = 0
    scaleDialogOpen.value = false
    return
  }

  canvasEngine.value.startCalibration()
  calibratingScale.value = true
  drawingRoom.value = false
  measuredCalibrationDistance.value = 0
  scaleDialogOpen.value = false
}

function applyScale(distanceMeters: number): void {
  canvasEngine.value?.setScale(distanceMeters)
  scaleDialogOpen.value = false
  calibratingScale.value = false
  measuredCalibrationDistance.value = 0
}

function closeScaleDialog(): void {
  scaleDialogOpen.value = false
}

function openScaleDialog(): void {
  if (!calibratingScale.value || measuredCalibrationDistance.value <= 0) {
    return
  }

  scaleDialogOpen.value = true
}

async function handlePlanUpload(file: File): Promise<void> {
  const reader = new FileReader()
  const fileDataUrl = await new Promise<string>((resolve, reject) => {
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Could not read image file'))
      }
    }

    reader.onerror = () => reject(reader.error ?? new Error('Image upload failed'))
    reader.readAsDataURL(file)
  })

  canvasEngine.value?.updatePlanImage({
    id: createId('plan'),
    name: 'Plan Image',
    dataUrl: fileDataUrl,
    position: { x: 0, y: 0 },
    rotationDeg: 0,
    opacity: 1,
    locked: false,
    visible: true,
  })
}

function addFurniture(): void {
  if (!canvasEngine.value || !currentFloor.value) {
    return
  }

  const roomMatch = currentFloor.value.rooms.find((room) => room.id === selectedLayerId.value)
  canvasEngine.value.addFurniture(roomMatch?.id ?? null)
}

async function createFloorFromDialog(name: string): Promise<void> {
  const newFloor = createEmptyFloor(name)
  floors.value.push(newFloor)
  await saveFloor(newFloor)
  await selectFloor(newFloor.id)
}

async function deleteFloorFromDialog(floorId: string): Promise<void> {
  if (floors.value.length <= 1) {
    return
  }

  floors.value = floors.value.filter((floor) => floor.id !== floorId)
  await deleteFloor(floorId)

  if (currentFloorId.value === floorId) {
    const fallbackFloor = floors.value[0]
    if (fallbackFloor) {
      await selectFloor(fallbackFloor.id)
    }
  }
}

async function renameFloorFromDialog(floorId: string, name: string): Promise<void> {
  const floor = floors.value.find((candidate) => candidate.id === floorId)
  if (!floor) {
    return
  }

  floor.name = name
  await saveFloor(floor)

  if (currentFloorId.value === floorId && canvasEngine.value) {
    canvasEngine.value.renameLayer(floorId, name)
  }
}
</script>

<template>
  <main class="canvas-bg relative h-screen w-screen overflow-hidden">
    <CanvasView @canvas-ready="setupCanvasEngine" @viewport-resize="handleViewportResize" />

    <TopBar
      :layers-open="layersOpen"
      @toggle-layers="layersOpen = !layersOpen"
      @open-settings="settingsOpen = true"
      @open-floors="floorsOpen = true"
    />

    <Toolbar
      :drawing-room="drawingRoom"
      :calibrating="calibratingScale"
      :has-plan-image="hasPlanImage"
      :grid-visible="gridVisible"
      :grid-spacing="gridSpacing"
      :grid-snap="gridSnap"
      :plan-opacity="planOpacity"
      @upload-plan="handlePlanUpload"
      @toggle-room-drawing="toggleRoomDrawing"
      @finish-room="finishRoom"
      @add-furniture="addFurniture"
      @start-calibration="startScaleCalibration"
      @set-grid-visible="canvasEngine?.setGridVisible($event)"
      @set-grid-spacing="canvasEngine?.setGridSpacing($event)"
      @set-grid-snap="canvasEngine?.setGridSnap($event)"
      @rotate-plan="canvasEngine?.rotatePlan($event)"
      @set-plan-opacity="canvasEngine?.updatePlanOpacity($event)"
    />

    <LayerPanel
      v-if="layersOpen"
      :root-node="layerTree"
      :selected-layer-id="selectedLayerId"
      @select-layer="canvasEngine?.selectObject($event)"
      @toggle-visibility="canvasEngine?.toggleVisibility($event)"
      @toggle-lock="canvasEngine?.toggleLock($event)"
      @rename-layer="(layerId, name) => canvasEngine?.renameLayer(layerId, name)"
    />

    <div
      v-if="drawingRoom || calibratingScale"
      class="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-white/95 px-4 py-2 text-sm shadow-panel"
    >
      <template v-if="drawingRoom">
        <span>
          Room mode: click points, drag points to adjust, click near first point to close, then "Finish room".
        </span>
      </template>
      <template v-else>
        <span v-if="measuredCalibrationDistance <= 0">Calibration mode: click two points on the floor plan.</span>
        <span v-else>
          Calibration points set ({{ measuredCalibrationDistance.toFixed(2) }} m). Drag points to adjust, then confirm.
        </span>
        <Button v-if="measuredCalibrationDistance > 0" size="sm" @click="openScaleDialog">Confirm points</Button>
      </template>
    </div>

    <ScaleDialog
      :open="scaleDialogOpen"
      :measured-distance="measuredCalibrationDistance"
      @close="closeScaleDialog"
      @apply="applyScale"
    />

    <SettingsDialog
      :open="settingsOpen"
      :meters-per-pixel="metersPerPixel"
      :grid-snap="gridSnap"
      @close="settingsOpen = false"
      @update-grid-snap="canvasEngine?.setGridSnap($event)"
    />

    <FloorsDialog
      :open="floorsOpen"
      :floors="floors"
      :current-floor-id="currentFloorId"
      @close="floorsOpen = false"
      @select-floor="selectFloor"
      @create-floor="createFloorFromDialog"
      @delete-floor="deleteFloorFromDialog"
      @rename-floor="renameFloorFromDialog"
    />
  </main>
</template>
