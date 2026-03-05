import { fabric } from 'fabric'
import {
  createFurnitureObject,
  createPlanImageObject,
  createRoomDraft,
  createRoomObject,
  type EngineFabricObject,
  polygonToWorldPoints,
} from '@/core/canvasObjects'
import { computePolygonAreaSqm } from '@/core/geometry'
import {
  applyFurnitureTransform,
  applyScaleCalibration,
  createFurnitureTemplate,
  renameLayer,
  toggleLayerLock,
  toggleLayerVisibility,
} from '@/core/floorActions'
import { drawGridOverlay } from '@/core/gridOverlay'
import { buildLayerTree } from '@/core/layerModel'
import { createId } from '@/lib/utils'
import { cloneFloorModel } from '@/core/floorClone'
import { fitObjectInViewport } from '@/core/viewportFit'
import {
  EngineMode,
  LayerType,
  type CalibrationResult,
  type FloorModel,
  type LayerNode,
  type PlanImageModel,
  type PointMeters,
  type RoomModel,
} from '@/types/domain'
export interface CanvasEngineCallbacks {
  onFloorUpdated?: (floor: FloorModel) => void
  onLayerTreeChanged?: (layerTree: LayerNode) => void
  onSelectionChanged?: (layerId: string | null) => void
  onCalibrationMeasured?: (calibration: CalibrationResult) => void
}
export class CanvasEngineCore {
  protected canvas: fabric.Canvas
  protected callbacks: CanvasEngineCallbacks
  protected floor: FloorModel | null = null
  protected objectById = new Map<string, EngineFabricObject>()
  protected mode: (typeof EngineMode)[keyof typeof EngineMode] = EngineMode.Idle
  protected isPanning = false
  protected draftRoomPoints: PointMeters[] = []
  protected draftRoomObject: fabric.Polyline | null = null
  protected calibrationPoints: PointMeters[] = []
  private renderRevision = 0
  constructor(canvasElement: HTMLCanvasElement, callbacks: CanvasEngineCallbacks = {}) {
    this.canvas = new fabric.Canvas(canvasElement, {
      preserveObjectStacking: true,
      selection: true,
      stopContextMenu: true,
      targetFindTolerance: 8,
    })
    this.callbacks = callbacks
  }
  setCallbacks(callbacks: CanvasEngineCallbacks): void {
    this.callbacks = callbacks
  }
  dispose(): void {
    this.canvas.dispose()
    this.objectById.clear()
  }
  resize(width: number, height: number): void {
    this.canvas.setWidth(width)
    this.canvas.setHeight(height)
    this.canvas.calcOffset()
    this.canvas.requestRenderAll()
  }
  getFloorSnapshot(): FloorModel | null {
    return this.floor ? cloneFloorModel(this.floor) : null
  }
  loadFloor(nextFloor: FloorModel): void {
    this.floor = cloneFloorModel(nextFloor)
    void this.refreshScene(true)
    this.emitLayerTree()
  }

  startCalibration(): void {
    this.mode = EngineMode.CalibrateScale
    this.calibrationPoints = []
    this.canvas.discardActiveObject()
    this.canvas.requestRenderAll()
  }

  cancelCalibration(): void {
    this.mode = EngineMode.Idle
    this.calibrationPoints = []
  }

  setScale(realDistanceMeters: number): void {
    if (!this.floor || this.calibrationPoints.length !== 2) {
      return
    }
    const firstPoint = this.calibrationPoints[0]
    const secondPoint = this.calibrationPoints[1]
    if (!firstPoint || !secondPoint) {
      return
    }
    if (!applyScaleCalibration(this.floor, firstPoint, secondPoint, realDistanceMeters)) {
      this.calibrationPoints = []
      return
    }
    this.calibrationPoints = []
    void this.refreshScene(false)
    this.emitChange()
  }

  startRoomDrawing(): void {
    this.mode = EngineMode.DrawRoom
    this.draftRoomPoints = []
    this.removeDraftRoom()
    this.canvas.discardActiveObject()
    this.canvas.requestRenderAll()
  }

  cancelRoomDrawing(): void {
    this.mode = EngineMode.Idle
    this.draftRoomPoints = []
    this.removeDraftRoom()
    this.canvas.requestRenderAll()
  }

  commitRoom(name: string): void {
    if (!this.floor || this.draftRoomPoints.length < 3) {
      return
    }
    const room: RoomModel = {
      id: createId('room'),
      name,
      points: [...this.draftRoomPoints],
      areaSqm: computePolygonAreaSqm(this.draftRoomPoints),
      locked: false,
      visible: true,
    }
    this.floor.rooms.push(room)
    const roomObject = createRoomObject(room)
    this.objectById.set(room.id, roomObject)
    this.canvas.add(roomObject)
    this.mode = EngineMode.Idle
    this.draftRoomPoints = []
    this.removeDraftRoom()
    this.emitChange()
  }

  addFurniture(targetRoomId: string | null = null): void {
    if (!this.floor) {
      return
    }
    const furniture = createFurnitureTemplate(this.floor, targetRoomId)
    this.floor.furnitures.push(furniture)
    const furnitureObject = createFurnitureObject(furniture)
    this.objectById.set(furniture.id, furnitureObject)
    this.canvas.add(furnitureObject)
    this.canvas.setActiveObject(furnitureObject)
    this.emitChange()
  }

  setGridVisible(isVisible: boolean): void {
    if (!this.floor) {
      return
    }
    this.floor.grid.visible = isVisible
    this.canvas.requestRenderAll()
    this.emitChange()
  }

  setGridSpacing(spacingMeters: 0.25 | 0.5 | 1): void {
    if (!this.floor) {
      return
    }
    this.floor.grid.spacingMeters = spacingMeters
    this.canvas.requestRenderAll()
    this.emitChange()
  }

  setGridSnap(enabled: boolean): void {
    if (!this.floor) {
      return
    }
    this.floor.grid.snap = enabled
    this.emitChange()
  }

  updatePlanOpacity(opacity: number): void {
    if (!this.floor?.planImage) {
      return
    }
    this.floor.planImage.opacity = opacity
    const planObject = this.objectById.get(this.floor.planImage.id)
    if (planObject) {
      planObject.set('opacity', opacity)
      this.canvas.requestRenderAll()
    }
    this.emitChange()
  }

  rotatePlan(deltaDeg: number): void {
    if (!this.floor?.planImage) {
      return
    }
    this.floor.planImage.rotationDeg += deltaDeg
    const planObject = this.objectById.get(this.floor.planImage.id)
    if (planObject) {
      planObject.rotate(this.floor.planImage.rotationDeg)
      this.canvas.requestRenderAll()
    }
    this.emitChange()
  }

  selectObject(layerId: string): void {
    const targetObject = this.objectById.get(layerId)
    if (!targetObject) {
      this.canvas.discardActiveObject()
      this.canvas.requestRenderAll()
      return
    }
    this.canvas.setActiveObject(targetObject)
    this.canvas.requestRenderAll()
  }

  toggleVisibility(layerId: string): void {
    if (!this.floor) {
      return
    }
    const visible = toggleLayerVisibility(this.floor, layerId)
    if (visible === null) {
      return
    }
    this.applyObjectVisibility(layerId, visible)
    this.emitChange()
  }

  toggleLock(layerId: string): void {
    if (!this.floor) {
      return
    }
    const locked = toggleLayerLock(this.floor, layerId)
    if (locked === null) {
      return
    }
    this.applyObjectLock(layerId, locked)
    this.emitChange()
  }

  renameLayer(layerId: string, nextName: string): void {
    if (!this.floor) {
      return
    }
    if (renameLayer(this.floor, layerId, nextName)) {
      this.emitChange()
    }
  }

  updatePlanImage(planImage: PlanImageModel): void {
    if (!this.floor) {
      return
    }
    this.floor.planImage = planImage
    void this.refreshScene(true)
    this.emitChange()
  }

  protected handleObjectModified(targetObject: EngineFabricObject): void {
    if (!this.floor || !targetObject.sqaleId || !targetObject.sqaleType) {
      return
    }
    if (targetObject.sqaleType === LayerType.PlanImage && this.floor.planImage) {
      this.floor.planImage.position = { x: targetObject.left ?? 0, y: targetObject.top ?? 0 }
      this.floor.planImage.rotationDeg = targetObject.angle ?? 0
      this.emitChange()
      return
    }
    if (targetObject.sqaleType === LayerType.Room) {
      const room = this.floor.rooms.find((candidate) => candidate.id === targetObject.sqaleId)
      if (!room) {
        return
      }
      room.points = polygonToWorldPoints(targetObject as fabric.Polygon)
      room.areaSqm = computePolygonAreaSqm(room.points)
      this.emitChange()
      return
    }
    if (targetObject.sqaleType === LayerType.Furniture) {
      const result = applyFurnitureTransform(this.floor, targetObject)
      if (!result) {
        return
      }
      targetObject.set({
        width: result.widthMeters,
        height: result.depthMeters,
        left: result.position.x,
        top: result.position.y,
        scaleX: 1,
        scaleY: 1,
      })
      this.emitChange()
    }
  }

  protected renderDraftRoom(): void {
    this.removeDraftRoom()
    if (this.draftRoomPoints.length === 0) {
      return
    }
    this.draftRoomObject = createRoomDraft(this.draftRoomPoints)
    this.canvas.add(this.draftRoomObject)
    this.canvas.requestRenderAll()
  }

  protected emitChange(): void {
    if (!this.floor) {
      return
    }
    this.callbacks.onFloorUpdated?.(cloneFloorModel(this.floor))
    this.emitLayerTree()
  }

  protected readonly drawGrid = (): void => {
    if (!this.floor?.grid.visible) {
      return
    }
    drawGridOverlay(this.canvas, this.floor.grid.spacingMeters)
  }

  private applyObjectVisibility(layerId: string, visible: boolean): void {
    const targetObject = this.objectById.get(layerId)
    if (!targetObject) {
      return
    }
    targetObject.visible = visible
    this.canvas.requestRenderAll()
  }

  private applyObjectLock(layerId: string, locked: boolean): void {
    const targetObject = this.objectById.get(layerId)
    if (!targetObject) {
      return
    }
    targetObject.set({ selectable: !locked, evented: !locked })
    this.canvas.requestRenderAll()
  }

  private async refreshScene(fitPlan: boolean): Promise<void> {
    const revision = ++this.renderRevision
    this.objectById.clear()
    this.canvas.clear()
    this.removeDraftRoom()
    const activeFloor = this.floor
    if (!activeFloor) {
      return
    }
    for (const room of activeFloor.rooms) {
      const roomObject = createRoomObject(room)
      this.objectById.set(room.id, roomObject)
      this.canvas.add(roomObject)
    }
    for (const furniture of activeFloor.furnitures) {
      const furnitureObject = createFurnitureObject(furniture)
      this.objectById.set(furniture.id, furnitureObject)
      this.canvas.add(furnitureObject)
    }

    if (activeFloor.planImage) {
      const planObject = await createPlanImageObject(activeFloor.planImage, activeFloor.scale.metersPerPixel)
      if (revision !== this.renderRevision) {
        return
      }
      this.objectById.set(activeFloor.planImage.id, planObject)
      this.canvas.add(planObject)
      planObject.sendToBack()
      if (fitPlan) {
        fitObjectInViewport(this.canvas, planObject)
      }
    }
    for (const sceneObject of this.canvas.getObjects()) {
      sceneObject.setCoords()
    }
    this.canvas.calcOffset()
    this.canvas.requestRenderAll()
  }

  private removeDraftRoom(): void {
    if (!this.draftRoomObject) {
      return
    }
    this.canvas.remove(this.draftRoomObject)
    this.draftRoomObject = null
  }

  private emitLayerTree(): void {
    if (!this.floor) {
      return
    }
    this.callbacks.onLayerTreeChanged?.(buildLayerTree(this.floor))
  }
}
