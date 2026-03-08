<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import ActionBar from '@/features/editor/components/ActionBar.vue'
import CanvasView from '@/features/canvas/components/CanvasView.vue'
import LayerContextMenu from '@/features/layers/components/LayerContextMenu.vue'
import LayerPanel from '@/features/layers/components/LayerPanel.vue'
import Toolbar from '@/features/editor/components/Toolbar.vue'
import TopBar from '@/features/editor/components/TopBar.vue'
import FloorsDialog from '@/features/floors/components/FloorsDialog.vue'
import ObjectEditDialog from '@/features/layers/components/ObjectEditDialog.vue'
import ScaleDialog from '@/features/canvas/components/ScaleDialog.vue'
import SettingsDialog from '@/features/settings/components/SettingsDialog.vue'
import { CanvasEngine, type LayerEditSnapshot } from '@/features/canvas/engine/canvasEngine'
import { useCanvasClipboard } from '@/features/clipboard/useCanvasClipboard'
import { APP_ROOT_VIEWPORT_CLASS } from '@/features/editor/layout/viewportClasses'
import { cloneFloorModel } from '@/features/floors/model/floorClone'
import { resolveMeasurementUnit } from '@/features/settings/model/measurementUnits'
import {
  bootstrapFloorState,
  createFurniturePresetFromFurniture,
  createEmptyFloor,
  deleteFurniturePreset,
  deleteFloor,
  listFurniturePresets,
  saveFloor,
  setCurrentFloorId,
} from '@/storage/db'
import { ScaleCalibrationMode, type FloorModel, type FurniturePresetModel, type LayerNode } from '@/types/domain'

const canvasEngine = ref<CanvasEngine | null>(null)
const floors = ref<FloorModel[]>([])
const currentFloor = ref<FloorModel | null>(null)
const currentFloorId = ref('')
const layerTree = ref<LayerNode | null>(null)
const selectedLayerId = ref<string | null>(null)
const selectedLayerSnapshot = ref<LayerEditSnapshot | null>(null)
const furniturePresets = ref<FurniturePresetModel[]>([])
const layersOpen = ref(false)
const settingsOpen = ref(false)
const floorsOpen = ref(false)
const scaleDialogOpen = ref(false)
const objectEditDialogOpen = ref(false)
const canvasContextMenuOpen = ref(false)
const canvasContextLayerId = ref<string | null>(null)
const measuredCalibrationDistance = ref(0)
const roomDraftClosed = ref(false)
const roomDraftAreaSqm = ref(0)
const drawingRoom = ref(false)
const calibratingScale = ref(false)
const measuringDistance = ref(false)
const measuredDistance = ref(0)
const calibrationMode = ref<(typeof ScaleCalibrationMode)[keyof typeof ScaleCalibrationMode] | null>(null)
const scaleDialogCalibrationMode = ref<(typeof ScaleCalibrationMode)[keyof typeof ScaleCalibrationMode]>(
  ScaleCalibrationMode.TwoPoint,
)
const scaleDialogRoomId = ref<string | null>(null)
let persistTimer: ReturnType<typeof setTimeout> | null = null
let pendingPersistFloor: FloorModel | null = null

const gridVisible = computed(() => currentFloor.value?.grid.visible ?? false)
const gridSpacing = computed(() => currentFloor.value?.grid.spacingMeters ?? 0.5)
const gridSnap = computed(() => currentFloor.value?.grid.snap ?? false)
const metersPerPixel = computed(() => currentFloor.value?.scale.metersPerPixel ?? 0.01)
const lengthUnit = computed(() => resolveMeasurementUnit(currentFloor.value?.lengthUnit))
const surfaceUnit = computed(() => resolveMeasurementUnit(currentFloor.value?.surfaceUnit))
const scaleDialogMeasuredSurfaceSqm = computed(() => {
  if (!scaleDialogRoomId.value || !currentFloor.value) {
    return roomDraftAreaSqm.value
  }

  const matchedRoom = currentFloor.value.rooms.find((room) => room.id === scaleDialogRoomId.value)
  return matchedRoom?.areaSqm ?? 0
})

// Keeping this orchestration in one module avoids cross-component watcher races between
// canvas selection, context menu targeting, persistence scheduling, and dialog snapshots.
// Intentional file-size exception: splitting this flow has repeatedly introduced state desync
// between selection, persistence debounce, and modal snapshots during rapid edits.
const canvasContextLayer = computed(() => {
  const contextLayerId = canvasContextLayerId.value
  if (!contextLayerId || !canvasEngine.value) {
    return null
  }

  if (selectedLayerSnapshot.value?.id === contextLayerId) {
    return selectedLayerSnapshot.value
  }

  return canvasEngine.value.getLayerEditSnapshot(contextLayerId)
})

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
  const [bootstrappedState, bootstrappedFurniturePresets] = await Promise.all([
    bootstrapFloorState(),
    listFurniturePresets(),
  ])
  floors.value = bootstrappedState.floors
  currentFloor.value = bootstrappedState.currentFloor
  currentFloorId.value = bootstrappedState.currentFloor.id
  furniturePresets.value = bootstrappedFurniturePresets
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
    onLayerContextMenuRequested(layerId) {
      canvasContextLayerId.value = layerId
      if (!layerId) {
        canvasContextMenuOpen.value = false
        return
      }

      if (selectedLayerId.value !== layerId) {
        selectedLayerId.value = layerId
      }
      syncSelectedLayerSnapshot()
    },
    onLayerDoubleClicked(layerId) {
      openLayerEdit(layerId)
    },
    onCalibrationMeasured(calibration) {
      measuredCalibrationDistance.value = calibration.measuredDistance
    },
    onDistanceMeasured(distanceMeters) {
      measuredDistance.value = distanceMeters
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

function handleCanvasContextMenuOpenChange(open: boolean): void {
  if (!open) {
    canvasContextMenuOpen.value = false
    canvasContextLayerId.value = null
    return
  }

  canvasContextMenuOpen.value = Boolean(canvasContextLayer.value)
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

  if (canvasEngine.value) {
    canvasEngine.value.cancelRoomDrawing()
    canvasEngine.value.cancelCalibration()
    canvasEngine.value.cancelMeasuring()
  }

  currentFloorId.value = nextFloorId
  currentFloor.value = cloneFloorModel(nextFloor)
  selectedLayerId.value = null
  selectedLayerSnapshot.value = null
  canvasContextLayerId.value = null
  canvasContextMenuOpen.value = false
  objectEditDialogOpen.value = false
  await setCurrentFloorId(nextFloorId)
  canvasEngine.value?.loadFloor(nextFloor)
  drawingRoom.value = false
  roomDraftClosed.value = false
  roomDraftAreaSqm.value = 0
  calibratingScale.value = false
  measuringDistance.value = false
  measuredDistance.value = 0
  calibrationMode.value = null
  scaleDialogRoomId.value = null
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

  if (calibratingScale.value) {
    cancelScaleCalibration()
  }
  if (measuringDistance.value) {
    cancelDistanceMeasure()
  }

  canvasEngine.value.startRoomDrawing()
  drawingRoom.value = true
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

function startScaleCalibration(mode: (typeof ScaleCalibrationMode)[keyof typeof ScaleCalibrationMode]): void {
  if (!canvasEngine.value) {
    return
  }

  if (drawingRoom.value) {
    cancelRoomDrawing()
  }
  if (measuringDistance.value) {
    cancelDistanceMeasure()
  }

  if (calibratingScale.value) {
    canvasEngine.value.cancelCalibration()
  }

  canvasEngine.value.startCalibration(mode)
  calibratingScale.value = true
  calibrationMode.value = mode
  scaleDialogCalibrationMode.value = mode
  measuredCalibrationDistance.value = 0
  roomDraftClosed.value = false
  roomDraftAreaSqm.value = 0
  scaleDialogRoomId.value = null
  scaleDialogOpen.value = false
}

function toggleDistanceMeasure(): void {
  if (!canvasEngine.value) {
    return
  }

  if (measuringDistance.value) {
    cancelDistanceMeasure()
    return
  }

  if (drawingRoom.value) {
    cancelRoomDrawing()
  }
  if (calibratingScale.value) {
    cancelScaleCalibration()
  }

  canvasEngine.value.startMeasuring()
  measuringDistance.value = true
  measuredDistance.value = 0
}

function cancelDistanceMeasure(): void {
  if (!canvasEngine.value) {
    return
  }

  canvasEngine.value.cancelMeasuring()
  measuringDistance.value = false
  measuredDistance.value = 0
}

function cancelScaleCalibration(): void {
  if (!canvasEngine.value) {
    return
  }

  canvasEngine.value.cancelCalibration()
  calibratingScale.value = false
  calibrationMode.value = null
  measuredCalibrationDistance.value = 0
  roomDraftClosed.value = false
  roomDraftAreaSqm.value = 0
  scaleDialogRoomId.value = null
  scaleDialogOpen.value = false
}

function applyScale(calibrationValue: number): void {
  if (!canvasEngine.value) {
    return
  }

  if (scaleDialogCalibrationMode.value === ScaleCalibrationMode.TwoPoint) {
    canvasEngine.value.setScale(calibrationValue)
  } else if (scaleDialogRoomId.value) {
    canvasEngine.value.setRoomSurfaceScale(scaleDialogRoomId.value, calibrationValue)
  } else {
    canvasEngine.value.setSurfaceScale(calibrationValue)
  }

  scaleDialogOpen.value = false
  scaleDialogRoomId.value = null
  if (calibratingScale.value) {
    calibratingScale.value = false
    calibrationMode.value = null
    measuredCalibrationDistance.value = 0
    roomDraftClosed.value = false
    roomDraftAreaSqm.value = 0
  }
}

function openScaleDialog(): void {
  if (!calibratingScale.value || !calibrationMode.value) {
    return
  }

  if (calibrationMode.value === ScaleCalibrationMode.TwoPoint && measuredCalibrationDistance.value <= 0) {
    return
  }
  if (calibrationMode.value === ScaleCalibrationMode.Surface && (!roomDraftClosed.value || roomDraftAreaSqm.value <= 0)) {
    return
  }

  scaleDialogCalibrationMode.value = calibrationMode.value
  scaleDialogRoomId.value = null
  scaleDialogOpen.value = true
}

function closeScaleDialog(): void {
  scaleDialogOpen.value = false
  scaleDialogRoomId.value = null
}

function calibrateRoomSurface(layerId: string): void {
  if (!canvasEngine.value || !currentFloor.value) {
    return
  }

  const roomMatch = currentFloor.value.rooms.find((room) => room.id === layerId)
  if (!roomMatch) {
    return
  }

  if (calibratingScale.value) {
    cancelScaleCalibration()
  }
  if (measuringDistance.value) {
    cancelDistanceMeasure()
  }
  if (drawingRoom.value) {
    cancelRoomDrawing()
  }

  scaleDialogCalibrationMode.value = ScaleCalibrationMode.Surface
  scaleDialogRoomId.value = roomMatch.id
  scaleDialogOpen.value = true
  canvasContextMenuOpen.value = false
}

function addFurniture(presetId: string | null = null): void {
  if (!canvasEngine.value || !currentFloor.value) {
    return
  }

  const preset = presetId
    ? furniturePresets.value.find((candidate) => candidate.id === presetId) ?? null
    : null
  const roomMatch = currentFloor.value.rooms.find((room) => room.id === selectedLayerId.value)
  canvasEngine.value.addFurniture(roomMatch?.id ?? null, canvasEngine.value.getViewportCenter(), preset)
}

function addFurnitureFromPreset(presetId: string): void {
  addFurniture(presetId)
}

async function saveFurniturePresetFromLayer(layerId: string): Promise<void> {
  if (!currentFloor.value) {
    return
  }

  const furniture = currentFloor.value.furnitures.find((candidate) => candidate.id === layerId)
  if (!furniture) {
    return
  }

  furniturePresets.value = await createFurniturePresetFromFurniture(
    {
      label: furniture.label,
      widthMeters: furniture.widthMeters,
      depthMeters: furniture.depthMeters,
      fillColor: furniture.fillColor,
    },
    furniture.label,
  )
}

async function deleteFurniturePresetFromToolbar(presetId: string): Promise<void> {
  furniturePresets.value = await deleteFurniturePreset(presetId)
}

function selectLayer(layerId: string): void {
  canvasEngine.value?.selectObject(layerId)
}

function toggleLayerVisibility(layerId: string): void {
  canvasEngine.value?.toggleVisibility(layerId)
}

function toggleLayerLock(layerId: string): void {
  canvasEngine.value?.toggleLock(layerId)
}

function renameLayer(layerId: string, name: string): void {
  canvasEngine.value?.renameLayer(layerId, name)
}

function bringLayerToFront(layerId: string): void {
  canvasEngine.value?.bringLayerToFront(layerId)
}

function bringLayerToBack(layerId: string): void {
  canvasEngine.value?.bringLayerToBack(layerId)
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
}

function applyLayerOpacity(payload: { layerId: string; opacity: number }): void {
  canvasEngine.value?.updateLayerOpacity(payload.layerId, payload.opacity)
}

function applyLayerColor(payload: { layerId: string; fillColor: string }): void {
  canvasEngine.value?.updateFurnitureColor(payload.layerId, payload.fillColor)
}

function applyLayerName(payload: { layerId: string; name: string }): void {
  canvasEngine.value?.renameLayer(payload.layerId, payload.name)
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
}

function deleteLayerFromPanel(layerId: string): void {
  canvasEngine.value?.deleteLayer(layerId)
  if (canvasContextLayerId.value === layerId) {
    canvasContextLayerId.value = null
    canvasContextMenuOpen.value = false
  }
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
  <main :class="APP_ROOT_VIEWPORT_CLASS">
    <CanvasView
      :context-menu-open="canvasContextMenuOpen"
      @canvas-ready="setupCanvasEngine"
      @viewport-resize="handleViewportResize"
      @context-menu-open-change="handleCanvasContextMenuOpenChange"
    >
      <template #context-menu-content>
        <LayerContextMenu
          v-if="canvasContextLayer"
          :layer-id="canvasContextLayer.id"
          :layer-type="canvasContextLayer.type"
          :visible="canvasContextLayer.visible"
          :locked="canvasContextLayer.locked"
          @toggle-visibility="toggleLayerVisibility"
          @toggle-lock="toggleLayerLock"
          @bring-to-front="bringLayerToFront"
          @bring-to-back="bringLayerToBack"
          @edit-layer="openLayerEdit"
          @save-furniture-preset="saveFurniturePresetFromLayer"
          @calibrate-layer="calibrateRoomSurface"
          @delete-layer="deleteLayerFromPanel"
        />
      </template>
    </CanvasView>

    <TopBar
      :layers-open="layersOpen"
      @toggle-layers="layersOpen = !layersOpen"
    />

    <Toolbar
      :drawing-room="drawingRoom"
      :calibrating="calibratingScale"
      :measuring="measuringDistance"
      :furniture-presets="furniturePresets"
      :length-unit="lengthUnit"
      @upload-plan="handlePlanUpload"
      @toggle-room-drawing="toggleRoomDrawing"
      @add-furniture="addFurniture"
      @add-furniture-from-preset="addFurnitureFromPreset"
      @delete-furniture-preset="deleteFurniturePresetFromToolbar"
      @start-calibration="startScaleCalibration"
      @toggle-measure="toggleDistanceMeasure"
      @open-settings="settingsOpen = true"
      @open-floors="floorsOpen = true"
    />

    <LayerPanel
      v-if="layersOpen"
      :root-node="layerTree"
      :selected-layer-id="selectedLayerId"
      @select-layer="selectLayer"
      @toggle-visibility="toggleLayerVisibility"
      @toggle-lock="toggleLayerLock"
      @bring-to-front="bringLayerToFront"
      @bring-to-back="bringLayerToBack"
      @rename-layer="renameLayer"
      @delete-layer="deleteLayerFromPanel"
      @edit-layer="openLayerEdit"
      @save-furniture-preset="saveFurniturePresetFromLayer"
      @calibrate-layer="calibrateRoomSurface"
    />

    <ActionBar
      :drawing-room="drawingRoom"
      :room-draft-closed="roomDraftClosed"
      :room-draft-area-sqm="roomDraftAreaSqm"
      :calibrating="calibratingScale"
      :measuring="measuringDistance"
      :calibration-mode="calibrationMode"
      :measured-calibration-distance="measuredCalibrationDistance"
      :measured-distance="measuredDistance"
      :selected-layer="selectedLayerSnapshot"
      :length-unit="lengthUnit"
      :surface-unit="surfaceUnit"
      @finish-room="finishRoom"
      @cancel-room-drawing="cancelRoomDrawing"
      @confirm-calibration="openScaleDialog"
      @cancel-calibration="cancelScaleCalibration"
      @cancel-measure="cancelDistanceMeasure"
      @apply-selected-size="applySelectionSize"
    />

    <ScaleDialog
      :open="scaleDialogOpen"
      :calibration-mode="scaleDialogCalibrationMode"
      :measured-distance="measuredCalibrationDistance"
      :measured-surface-sqm="scaleDialogMeasuredSurfaceSqm"
      :length-unit="lengthUnit"
      :surface-unit="surfaceUnit"
      @close="closeScaleDialog"
      @apply="applyScale"
    />

    <SettingsDialog
      :open="settingsOpen"
      :meters-per-pixel="metersPerPixel"
      :length-unit="lengthUnit"
      :surface-unit="surfaceUnit"
      :grid-visible="gridVisible"
      :grid-spacing="gridSpacing"
      :grid-snap="gridSnap"
      @close="settingsOpen = false"
      @update-length-unit="canvasEngine?.setLengthUnit($event)"
      @update-surface-unit="canvasEngine?.setSurfaceUnit($event)"
      @update-grid-visible="canvasEngine?.setGridVisible($event)"
      @update-grid-spacing="canvasEngine?.setGridSpacing($event)"
      @update-grid-snap="canvasEngine?.setGridSnap($event)"
    />

    <FloorsDialog
      :open="floorsOpen"
      :floors="floors"
      :current-floor-id="currentFloorId"
      :surface-unit="surfaceUnit"
      @close="floorsOpen = false"
      @select-floor="selectFloor"
      @create-floor="createFloorFromDialog"
      @delete-floor="deleteFloorFromDialog"
      @rename-floor="renameFloorFromDialog"
    />

    <ObjectEditDialog
      :open="objectEditDialogOpen"
      :target="selectedLayerSnapshot"
      :length-unit="lengthUnit"
      :surface-unit="surfaceUnit"
      @close="objectEditDialogOpen = false"
      @apply-label="applyLayerName"
      @apply-frame="applyLayerFrame"
      @apply-opacity="applyLayerOpacity"
      @apply-color="applyLayerColor"
    />
  </main>
</template>
