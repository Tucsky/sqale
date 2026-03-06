import type { Ref } from 'vue'

import { createCanvasClipboardBindings } from '@/features/clipboard/model/canvasClipboard'
import type { LayerEditSnapshot } from '@/features/canvas/engine/canvasEngine'
import { cloneFurnitureModel, duplicateFurniture } from '@/features/floors/model/floorActions'
import { buildFloorNameFromImageFile, createPlanImageModel, readFileAsDataUrl } from '@/features/floors/model/planImageUpload'
import { createEmptyFloor, saveFloor } from '@/storage/db'
import { LayerType, type FloorModel, type FurnitureModel, type PlanImageModel, type PointMeters } from '@/types/domain'

interface CanvasClipboardEngine {
  getViewportCenter: () => PointMeters
  insertFurniture: (furniture: FurnitureModel) => void
  updatePlanImage: (planImage: PlanImageModel) => void
}

interface UseCanvasClipboardOptions {
  canvasEngine: Ref<CanvasClipboardEngine | null>
  currentFloor: Ref<FloorModel | null>
  deleteSelectedObject: () => void
  floors: Ref<FloorModel[]>
  selectedLayerSnapshot: Ref<LayerEditSnapshot | null>
  selectedLayerId: Ref<string | null>
  syncSelectedLayerSnapshot: () => void
  selectFloor: (nextFloorId: string) => Promise<void>
}

interface CanvasClipboardComposable {
  bindClipboardHandlers: () => void
  unbindClipboardHandlers: () => void
  handlePlanUpload: (file: File) => Promise<void>
}

/**
 * Centralizes clipboard behavior for furniture copy/paste and image paste/upload handling.
 */
export function useCanvasClipboard(options: UseCanvasClipboardOptions): CanvasClipboardComposable {
  const clipboardBindings = createCanvasClipboardBindings({
    deleteSelection: options.deleteSelectedObject,
    readSelectedFurniture,
    pasteFurniture: pasteCopiedFurniture,
    pasteImage: handlePastedImage,
  })

  function bindClipboardHandlers(): void {
    window.addEventListener('copy', clipboardBindings.onCopy)
    window.addEventListener('keydown', clipboardBindings.onKeyDown)
    window.addEventListener('paste', clipboardBindings.onPaste)
  }

  function unbindClipboardHandlers(): void {
    window.removeEventListener('copy', clipboardBindings.onCopy)
    window.removeEventListener('keydown', clipboardBindings.onKeyDown)
    window.removeEventListener('paste', clipboardBindings.onPaste)
  }

  async function handlePlanUpload(file: File): Promise<void> {
    const engine = options.canvasEngine.value
    if (!engine) {
      return
    }
    const imageDataUrl = await readFileAsDataUrl(file)
    engine.updatePlanImage(createPlanImageModel(imageDataUrl, file.name || 'Plan Image'))
  }

  function readSelectedFurniture(): FurnitureModel | null {
    const selectedLayer = options.selectedLayerSnapshot.value
    const floor = options.currentFloor.value
    if (!selectedLayer || selectedLayer.type !== LayerType.Furniture || !floor) {
      return null
    }
    const furniture = floor.furnitures.find((candidate) => candidate.id === selectedLayer.id)
    return furniture ? cloneFurnitureModel(furniture) : null
  }

  function pasteCopiedFurniture(sourceFurniture: FurnitureModel): void {
    const engine = options.canvasEngine.value
    const floor = options.currentFloor.value
    if (!engine || !floor) {
      return
    }
    const duplicatedFurniture = duplicateFurniture(floor, sourceFurniture, engine.getViewportCenter())
    engine.insertFurniture(duplicatedFurniture)
    options.selectedLayerId.value = duplicatedFurniture.id
    options.syncSelectedLayerSnapshot()
  }

  async function handlePastedImage(file: File): Promise<void> {
    const engine = options.canvasEngine.value
    const floor = options.currentFloor.value
    if (!engine || !floor) {
      return
    }
    const imageDataUrl = await readFileAsDataUrl(file)
    const planImageName = file.name || 'Plan Image'
    if (!floor.planImage) {
      engine.updatePlanImage(createPlanImageModel(imageDataUrl, planImageName))
      return
    }
    const nextFloor = createEmptyFloor(buildFloorNameFromImageFile(file.name, options.floors.value.length))
    nextFloor.planImage = createPlanImageModel(imageDataUrl, planImageName)
    options.floors.value.push(nextFloor)
    await saveFloor(nextFloor)
    await options.selectFloor(nextFloor.id)
  }

  return {
    bindClipboardHandlers,
    unbindClipboardHandlers,
    handlePlanUpload,
  }
}
