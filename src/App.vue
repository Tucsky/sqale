<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import OngoingActionBar from '@/components/OngoingActionBar.vue'
import CanvasView from '@/components/CanvasView.vue'
import LayerPanel from '@/components/LayerPanel.vue'
import Toolbar from '@/components/Toolbar.vue'
import TopBar from '@/components/TopBar.vue'
import FloorsDialog from '@/components/dialogs/FloorsDialog.vue'
import ObjectEditDialog from '@/components/dialogs/ObjectEditDialog.vue'
import ScaleDialog from '@/components/dialogs/ScaleDialog.vue'
import SettingsDialog from '@/components/dialogs/SettingsDialog.vue'
import { CanvasEngine, type LayerEditSnapshot } from '@/core/canvasEngine'
import { useCanvasClipboard } from '@/composables/useCanvasClipboard'
import { cloneFloorModel } from '@/core/floorClone'
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
const selectedLayerSnapshot = ref<LayerEditSnapshot | null>(null)
const layersOpen = ref(true)
const settingsOpen = ref(false)
const floorsOpen = ref(false)
const scaleDialogOpen = ref(false)
const objectEditDialogOpen = ref(false)
const measuredCalibrationDistance = ref(0)
const roomDraftClosed = ref(false)
const roomDraftAreaSqm = ref(0)
const drawingRoom = ref(false)
const calibratingScale = ref(false)
let persistTimer: ReturnType<typeof setTimeout> | null = null
let pendingPersistFloor: FloorModel | null = null
const gridVisible = computed(() => currentFloor.value?.grid.visible ?? false)
const gridSpacing = computed(() => currentFloor.value?.grid.spacingMeters ?? 0.5)
const gridSnap = computed(() => currentFloor.value?.grid.snap ?? false)
const metersPerPixel = computed(() => currentFloor.value?.scale.metersPerPixel ?? 0.01)
const { bindClipboardHandlers, unbindClipboardHandlers, handlePlanUpload } = useCanvasClipboard({
  canvasEngine,
  currentFloor,
  deleteSelectedObject,
  floors,
  selectedLayerSnapshot,
  selectedLayerId,
  syncSelectedLayerSnapshot,
  selectFloor,
})
onMounted(async () => {
  bindClipboardHandlers()
  const bootstrappedState = await bootstrapFloorState()
  floors.value = bootstrappedState.floors
  currentFloor.value = bootstrappedState.currentFloor
  currentFloorId.value = bootstrappedState.currentFloor.id
  if (canvasEngine.value) {
    canvasEngine.value.loadFloor(bootstrappedState.currentFloor)
  }
})
onBeforeUnmount(() => {
  unbindClipboardHandlers()
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
      syncSelectedLayerSnapshot()
    },
    onLayerTreeChanged(nextLayerTree) {
      layerTree.value = nextLayerTree
    },
    onSelectionChanged(layerId) {
      selectedLayerId.value = layerId
      syncSelectedLayerSnapshot()
    },
    onLayerDoubleClicked(layerId) {
      openLayerEdit(layerId)
    },
    onCalibrationMeasured(calibration) {
      measuredCalibrationDistance.value = calibration.measuredDistance
    },
    onRoomDraftChanged(draft) {
      roomDraftClosed.value = draft.isClosed
      roomDraftAreaSqm.value = draft.areaSqm
    },
  })
  if (currentFloor.value) {
    canvasEngine.value.loadFloor(currentFloor.value)
  }
}
function handleViewportResize(width: number, height: number): void {
  canvasEngine.value?.resize(width, height)
}
function syncSelectedLayerSnapshot(): void {
  if (!canvasEngine.value || !selectedLayerId.value) {
    selectedLayerSnapshot.value = null
    return
  }
  selectedLayerSnapshot.value = canvasEngine.value.getLayerEditSnapshot(selectedLayerId.value)
  if (!selectedLayerSnapshot.value) {
    objectEditDialogOpen.value = false
  }
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
  selectedLayerId.value = null
  selectedLayerSnapshot.value = null
  objectEditDialogOpen.value = false
  await setCurrentFloorId(nextFloorId)
  canvasEngine.value?.loadFloor(nextFloor)
  drawingRoom.value = false
  roomDraftClosed.value = false
  roomDraftAreaSqm.value = 0
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
    roomDraftClosed.value = false
    roomDraftAreaSqm.value = 0
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
  roomDraftClosed.value = false
  roomDraftAreaSqm.value = 0
}
function cancelRoomDrawing(): void {
  if (!canvasEngine.value || !drawingRoom.value) {
    return
  }
  canvasEngine.value.cancelRoomDrawing()
  drawingRoom.value = false
  roomDraftClosed.value = false
  roomDraftAreaSqm.value = 0
}
function startScaleCalibration(): void {
  if (!canvasEngine.value) {
    return
  }
  if (calibratingScale.value) {
    cancelScaleCalibration()
    return
  }
  canvasEngine.value.startCalibration()
  calibratingScale.value = true
  drawingRoom.value = false
  measuredCalibrationDistance.value = 0
  scaleDialogOpen.value = false
}
function cancelScaleCalibration(): void {
  if (!canvasEngine.value) {
    return
  }
  canvasEngine.value.cancelCalibration()
  calibratingScale.value = false
  measuredCalibrationDistance.value = 0
  scaleDialogOpen.value = false
}
function applyScale(distanceMeters: number): void {
  canvasEngine.value?.setScale(distanceMeters)
  scaleDialogOpen.value = false
  calibratingScale.value = false
  measuredCalibrationDistance.value = 0
}
function openScaleDialog(): void {
  if (!calibratingScale.value || measuredCalibrationDistance.value <= 0) {
    return
  }
  scaleDialogOpen.value = true
}
function addFurniture(): void {
  if (!canvasEngine.value || !currentFloor.value) {
    return
  }
  const roomMatch = currentFloor.value.rooms.find((room) => room.id === selectedLayerId.value)
  canvasEngine.value.addFurniture(roomMatch?.id ?? null, canvasEngine.value.getViewportCenter())
}
function openLayerEdit(layerId: string): void {
  if (!canvasEngine.value) {
    return
  }
  canvasEngine.value.selectObject(layerId)
  selectedLayerId.value = layerId
  syncSelectedLayerSnapshot()
  if (selectedLayerSnapshot.value) {
    objectEditDialogOpen.value = true
  }
}
function applyLayerFrame(payload: { layerId: string; x: number; y: number; width: number; height: number }): void {
  canvasEngine.value?.updateLayerFrame(payload.layerId, payload.x, payload.y, payload.width, payload.height)
  syncSelectedLayerSnapshot()
}
function applyLayerOpacity(payload: { layerId: string; opacity: number }): void {
  canvasEngine.value?.updateLayerOpacity(payload.layerId, payload.opacity)
  syncSelectedLayerSnapshot()
}
function applyLayerColor(payload: { layerId: string; fillColor: string }): void {
  canvasEngine.value?.updateFurnitureColor(payload.layerId, payload.fillColor)
  syncSelectedLayerSnapshot()
}
function applySelectionSize(payload: { layerId: string; width: number; height: number }): void {
  if (!selectedLayerSnapshot.value || selectedLayerSnapshot.value.id !== payload.layerId) {
    return
  }
  canvasEngine.value?.updateLayerFrame(
    payload.layerId,
    selectedLayerSnapshot.value.x,
    selectedLayerSnapshot.value.y,
    payload.width,
    payload.height,
  )
  syncSelectedLayerSnapshot()
}
function deleteLayerFromPanel(layerId: string): void {
  canvasEngine.value?.deleteLayer(layerId)
  if (selectedLayerId.value === layerId) {
    selectedLayerId.value = null
    selectedLayerSnapshot.value = null
    objectEditDialogOpen.value = false
  }
}
function deleteSelectedObject(): void {
  if (!selectedLayerSnapshot.value) {
    return
  }
  deleteLayerFromPanel(selectedLayerSnapshot.value.id)
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
    />
    <Toolbar
      :drawing-room="drawingRoom"
      :calibrating="calibratingScale"
      @upload-plan="handlePlanUpload"
      @toggle-room-drawing="toggleRoomDrawing"
      @add-furniture="addFurniture"
      @start-calibration="startScaleCalibration"
      @open-settings="settingsOpen = true"
      @open-floors="floorsOpen = true"
    />
    <LayerPanel
      v-if="layersOpen"
      :root-node="layerTree"
      :selected-layer-id="selectedLayerId"
      @select-layer="canvasEngine?.selectObject($event)"
      @toggle-visibility="canvasEngine?.toggleVisibility($event)"
      @toggle-lock="canvasEngine?.toggleLock($event)"
      @rename-layer="(layerId, name) => canvasEngine?.renameLayer(layerId, name)"
      @delete-layer="deleteLayerFromPanel"
      @edit-layer="openLayerEdit"
    />
    <OngoingActionBar
      :drawing-room="drawingRoom"
      :room-draft-closed="roomDraftClosed"
      :room-draft-area-sqm="roomDraftAreaSqm"
      :calibrating="calibratingScale"
      :measured-calibration-distance="measuredCalibrationDistance"
      :selected-layer="selectedLayerSnapshot"
      @finish-room="finishRoom"
      @cancel-room-drawing="cancelRoomDrawing"
      @confirm-calibration="openScaleDialog"
      @cancel-calibration="cancelScaleCalibration"
      @apply-selected-size="applySelectionSize"
    />
    <ScaleDialog :open="scaleDialogOpen" :measured-distance="measuredCalibrationDistance" @close="scaleDialogOpen = false" @apply="applyScale" />
    <SettingsDialog
      :open="settingsOpen"
      :meters-per-pixel="metersPerPixel"
      :grid-visible="gridVisible"
      :grid-spacing="gridSpacing"
      :grid-snap="gridSnap"
      @close="settingsOpen = false"
      @update-grid-visible="canvasEngine?.setGridVisible($event)"
      @update-grid-spacing="canvasEngine?.setGridSpacing($event)"
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
    <ObjectEditDialog
      :open="objectEditDialogOpen"
      :target="selectedLayerSnapshot"
      @close="objectEditDialogOpen = false"
      @apply-frame="applyLayerFrame"
      @apply-opacity="applyLayerOpacity"
      @apply-color="applyLayerColor"
    />
  </main>
</template>
