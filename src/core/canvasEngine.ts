import { fabric } from 'fabric'
import { applyFurniturePaintToSceneObject, snapValue, type EngineFabricObject } from '@/core/canvasObjects'
import { DraftOverlays, type DraftHandleObject } from '@/core/draftOverlays'
import { moveLayerToBack, moveLayerToFront, removeLayer, setFurnitureFillColor, setLayerOpacity } from '@/core/floorActions'
import { distanceMeters } from '@/core/geometry'
import { getDraftRoomAreaSqm } from '@/core/roomDraft'
import { clamp } from '@/lib/utils'
import { panViewport, zoomFromWheel } from '@/core/viewport'
import { EngineMode, LayerType, type PointMeters } from '@/types/domain'
import { CanvasEngineCore, type CanvasEngineCallbacks } from './canvasEngineCore'
import { applyLayerFrameToSceneObject, buildLayerEditSnapshot, type LayerEditSnapshot } from './layerEditing'
export type { LayerEditSnapshot } from './layerEditing'
interface ObjectInteractionState {
  evented: boolean
  hasBorders: boolean
  hasControls: boolean
  selectable: boolean
}
const INTERNAL_HELPER_OBJECT_ID = '__sqale_controls_helper__'
/**
 * Thin interaction layer: binds Fabric mouse/selection events to core engine logic.
 */
export class CanvasEngine extends CanvasEngineCore {
  private draftOverlays = new DraftOverlays()
  private sketchModeActive = false
  private sceneInteractionStateById = new Map<string, ObjectInteractionState>()
  constructor(canvasElement: HTMLCanvasElement, callbacks: CanvasEngineCallbacks = {}) {
    super(canvasElement, callbacks)
    this.bindCanvasEvents()
    this.ensureControlsHelperObject()
  }
  override loadFloor(nextFloor: Parameters<CanvasEngineCore['loadFloor']>[0]): void {
    this.draftOverlays.resetAll(this.canvas)
    this.deactivateSketchMode()
    super.loadFloor(nextFloor)
    this.emitRoomDraftStatus()
  }
  override startRoomDrawing(): void {
    super.startRoomDrawing()
    this.draftOverlays.resetRoom(this.canvas)
    this.activateSketchMode()
    this.emitRoomDraftStatus()
  }
  override cancelRoomDrawing(): void {
    super.cancelRoomDrawing()
    this.draftOverlays.resetRoom(this.canvas)
    this.deactivateSketchMode()
    this.emitRoomDraftStatus()
  }
  override commitRoom(name: string): void {
    if (this.draftRoomPoints.length < 3) {
      return
    }
    super.commitRoom(name)
    this.draftOverlays.resetRoom(this.canvas)
    this.deactivateSketchMode()
    this.emitRoomDraftStatus()
  }
  override startCalibration(): void {
    super.startCalibration()
    this.draftOverlays.resetCalibration(this.canvas)
    this.activateSketchMode()
  }
  override cancelCalibration(): void {
    super.cancelCalibration()
    this.draftOverlays.resetCalibration(this.canvas)
    this.deactivateSketchMode()
  }
  override setScale(realDistanceMeters: number): void {
    const shouldExitCalibration = this.calibrationPoints.length === 2
    super.setScale(realDistanceMeters)
    if (shouldExitCalibration) {
      this.draftOverlays.resetCalibration(this.canvas)
      this.deactivateSketchMode()
    }
  }
  getViewportCenter(): PointMeters {
    const viewportTransform = this.canvas.viewportTransform
    if (!viewportTransform) {
      return { x: 0, y: 0 }
    }
    const canvasCenter = new fabric.Point(this.canvas.getWidth() * 0.5, this.canvas.getHeight() * 0.5)
    const sceneCenter = fabric.util.transformPoint(canvasCenter, fabric.util.invertTransform(viewportTransform))
    return { x: sceneCenter.x, y: sceneCenter.y }
  }
  getLayerEditSnapshot(layerId: string | null): LayerEditSnapshot | null {
    if (!this.floor || !layerId) {
      return null
    }
    return buildLayerEditSnapshot(this.floor, this.objectById, layerId)
  }
  updateLayerFrame(layerId: string, x: number, y: number, width: number, height: number): void {
    const sceneObject = this.objectById.get(layerId)
    if (!sceneObject) {
      return
    }
    if (!applyLayerFrameToSceneObject(sceneObject, { x, y, width, height })) {
      return
    }
    this.handleObjectModified(sceneObject)
    this.canvas.requestRenderAll()
  }
  updateLayerOpacity(layerId: string, opacity: number): void {
    if (!this.floor) {
      return
    }
    const clampedOpacity = clamp(opacity, 0.05, 1)
    if (!setLayerOpacity(this.floor, layerId, clampedOpacity)) {
      return
    }
    const sceneObject = this.objectById.get(layerId)
    if (sceneObject) {
      sceneObject.set('opacity', clampedOpacity)
      sceneObject.setCoords()
      this.canvas.requestRenderAll()
    }
    this.emitChange()
  }
  updateFurnitureColor(layerId: string, fillColor: string): void {
    if (!this.floor) {
      return
    }
    if (!setFurnitureFillColor(this.floor, layerId, fillColor)) {
      return
    }

    const sceneObject = this.objectById.get(layerId)
    if (sceneObject) {
      applyFurniturePaintToSceneObject(sceneObject, fillColor)
      sceneObject.setCoords()
      this.canvas.requestRenderAll()
    }
    this.emitChange()
  }
  deleteLayer(layerId: string): void {
    if (!this.floor || !removeLayer(this.floor, layerId)) {
      return
    }
    const sceneObject = this.objectById.get(layerId)
    if (sceneObject) {
      this.canvas.remove(sceneObject)
      this.objectById.delete(layerId)
    }
    this.canvas.discardActiveObject()
    this.canvas.requestRenderAll()
    this.callbacks.onSelectionChanged?.(null)
    this.emitChange()
  }
  bringLayerToFront(layerId: string): void {
    if (!this.floor || !moveLayerToFront(this.floor, layerId)) {
      return
    }

    this.syncStackingOrder()
    this.emitChange()
  }
  bringLayerToBack(layerId: string): void {
    if (!this.floor || !moveLayerToBack(this.floor, layerId)) {
      return
    }

    this.syncStackingOrder()
    this.emitChange()
  }
  private bindCanvasEvents(): void {
    this.canvas.on('mouse:wheel', this.onMouseWheel)
    this.canvas.on('mouse:down', this.onMouseDown)
    this.canvas.on('mouse:move', this.onMouseMove)
    this.canvas.on('mouse:up', this.onMouseUp)
    this.canvas.on('mouse:dblclick', this.onMouseDoubleClick)
    this.canvas.on('selection:created', this.onSelectionChanged)
    this.canvas.on('selection:updated', this.onSelectionChanged)
    this.canvas.on('selection:cleared', () => this.callbacks.onSelectionChanged?.(null))
    this.canvas.on('object:added', this.onObjectAdded)
    this.canvas.on('object:moving', this.onObjectMoving)
    this.canvas.on('object:modified', this.onObjectModified)
    this.canvas.on('after:render', this.drawGrid)
  }
  private readonly onMouseWheel = (event: fabric.IEvent<WheelEvent>): void => {
    zoomFromWheel(
      this.canvas,
      {
        x: event.e.offsetX,
        y: event.e.offsetY,
      },
      event.e.deltaY,
    )
    this.syncSceneCoords()
    event.e.preventDefault()
    event.e.stopPropagation()
  }
  private readonly onMouseDown = (event: fabric.IEvent<MouseEvent>): void => {
    if (event.e.button === 2) {
      this.handleContextMenuTarget(event.target as EngineFabricObject | undefined)
      return
    }

    const pointer = this.canvas.getPointer(event.e)
    if (this.mode === EngineMode.DrawRoom) {
      if (this.draftOverlays.isDraftHandle(event.target, 'room')) {
        this.draftOverlays.closeRoomFromHandle(this.canvas, this.draftRoomPoints, event.target.sqaleDraftIndex)
        this.emitRoomDraftStatus()
        return
      }
      this.draftOverlays.placeRoomPoint(this.canvas, this.draftRoomPoints, { x: pointer.x, y: pointer.y })
      this.emitRoomDraftStatus()
      return
    }
    if (this.mode === EngineMode.CalibrateScale) {
      if (this.draftOverlays.isDraftHandle(event.target, 'calibration')) {
        return
      }
      this.draftOverlays.placeCalibrationPoint(this.canvas, this.calibrationPoints, {
        x: pointer.x,
        y: pointer.y,
      })
      this.emitCalibrationMeasurement()
      return
    }
    const transformEvent = event as fabric.IEvent<MouseEvent> & { transform?: fabric.Transform }
    if (!event.target && !transformEvent.transform && !this.canvas.getActiveObject()) {
      this.isPanning = true
      this.canvas.selection = false
    }
  }
  private readonly onMouseMove = (event: fabric.IEvent<MouseEvent>): void => {
    if (this.isPanning) {
      panViewport(this.canvas, event.e.movementX, event.e.movementY)
    }
  }
  private readonly onMouseUp = (): void => {
    this.isPanning = false
    this.canvas.selection = !this.sketchModeActive
    this.syncSceneCoords()
  }
  private readonly onMouseDoubleClick = (event: fabric.IEvent<MouseEvent>): void => {
    const targetObject = event.target as EngineFabricObject | undefined
    if (!targetObject?.sqaleId || targetObject.sqaleType !== LayerType.Furniture) {
      return
    }
    this.callbacks.onLayerDoubleClicked?.(targetObject.sqaleId)
  }
  private readonly onSelectionChanged = (event: fabric.IEvent<Event>): void => {
    if (!event.selected || event.selected.length === 0) {
      return
    }
    const selectedObject = event.selected[0] as EngineFabricObject & DraftHandleObject
    if (selectedObject.sqaleDraftKind) {
      return
    }
    this.callbacks.onSelectionChanged?.(selectedObject.sqaleId ?? null)
  }
  private readonly onObjectAdded = (event: fabric.IEvent<Event>): void => {
    if (!event.target) {
      return
    }
    const addedObject = event.target as EngineFabricObject & DraftHandleObject
    addedObject.setCoords()
    if (addedObject.sqaleId === INTERNAL_HELPER_OBJECT_ID) {
      return
    }
    if (this.sketchModeActive || addedObject.sqaleDraftKind) {
      return
    }
    this.ensureControlsHelperObject()
    this.activateControlsWorkaround()
  }
  private readonly onObjectMoving = (event: fabric.IEvent<Event>): void => {
    if (!event.target) {
      return
    }
    const movingObject = event.target as EngineFabricObject & DraftHandleObject
    if (this.mode === EngineMode.DrawRoom && this.draftOverlays.isDraftHandle(movingObject, 'room')) {
      this.draftOverlays.syncRoomDraftHandle(this.canvas, this.draftRoomPoints, movingObject)
      this.emitRoomDraftStatus()
      return
    }
    if (this.mode === EngineMode.CalibrateScale && this.draftOverlays.isDraftHandle(movingObject, 'calibration')) {
      this.draftOverlays.syncCalibrationDraftHandle(this.canvas, this.calibrationPoints, movingObject)
      this.emitCalibrationMeasurement()
      return
    }
    if (!this.floor?.grid.snap || movingObject.sqaleType !== LayerType.Furniture) {
      return
    }
    const spacingMeters = this.floor.grid.spacingMeters
    movingObject.set({
      left: snapValue(movingObject.left ?? 0, spacingMeters),
      top: snapValue(movingObject.top ?? 0, spacingMeters),
    })
  }
  private readonly onObjectModified = (event: fabric.IEvent<Event>): void => {
    if (!event.target) {
      return
    }
    const modifiedObject = event.target as EngineFabricObject & DraftHandleObject
    if (modifiedObject.sqaleDraftKind) {
      return
    }
    this.handleObjectModified(modifiedObject)
  }
  private emitCalibrationMeasurement(): void {
    if (this.calibrationPoints.length !== 2) {
      return
    }
    const firstPoint = this.calibrationPoints[0]
    const secondPoint = this.calibrationPoints[1]
    if (!firstPoint || !secondPoint) {
      return
    }
    this.callbacks.onCalibrationMeasured?.({
      firstPoint,
      secondPoint,
      measuredDistance: distanceMeters(firstPoint, secondPoint),
    })
  }
  private emitRoomDraftStatus(): void {
    const isClosed = this.draftOverlays.isRoomClosed()
    const areaSqm = getDraftRoomAreaSqm(this.draftRoomPoints, isClosed)
    this.callbacks.onRoomDraftChanged?.({ isClosed, areaSqm })
  }
  private activateSketchMode(): void {
    if (this.sketchModeActive) {
      return
    }
    this.sketchModeActive = true
    this.isPanning = false
    this.canvas.discardActiveObject()
    this.sceneInteractionStateById.clear()
    for (const [objectId, sceneObject] of this.objectById) {
      this.sceneInteractionStateById.set(objectId, {
        selectable: Boolean(sceneObject.selectable),
        evented: Boolean(sceneObject.evented),
        hasControls: Boolean(sceneObject.hasControls),
        hasBorders: Boolean(sceneObject.hasBorders),
      })
      sceneObject.set({
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false,
      })
    }
    this.canvas.selection = false
    this.canvas.defaultCursor = 'crosshair'
    this.canvas.hoverCursor = 'crosshair'
    this.canvas.requestRenderAll()
  }
  private deactivateSketchMode(): void {
    if (!this.sketchModeActive) {
      return
    }
    this.sketchModeActive = false
    for (const [objectId, objectState] of this.sceneInteractionStateById) {
      const sceneObject = this.objectById.get(objectId)
      if (!sceneObject) {
        continue
      }
      sceneObject.set(objectState)
    }
    this.sceneInteractionStateById.clear()
    this.canvas.selection = true
    this.canvas.defaultCursor = 'default'
    this.canvas.hoverCursor = 'move'
    this.canvas.requestRenderAll()
  }
  /**
   * Fabric control hitboxes can desync after object reconstruction.
   * This workaround forces Fabric to rebuild interactive control state.
   */
  private activateControlsWorkaround(): void {
    const sceneObjects = this.canvas.getObjects()
    const selection = new fabric.ActiveSelection(sceneObjects, { canvas: this.canvas })
    this.canvas.setActiveObject(selection)
    this.canvas.discardActiveObject()
    this.canvas.requestRenderAll()
  }
  private ensureControlsHelperObject(): void {
    for (const canvasObject of this.canvas.getObjects()) {
      const objectWithId = canvasObject as EngineFabricObject
      if (objectWithId.sqaleId === INTERNAL_HELPER_OBJECT_ID) {
        return
      }
    }
    const helperObject = new fabric.Object({
      left: -100_000,
      top: -100_000,
      width: 0,
      height: 0,
      opacity: 0,
      selectable: false,
      evented: false,
      hasControls: false,
      hasBorders: false,
      excludeFromExport: true,
      objectCaching: false,
    }) as EngineFabricObject
    helperObject.sqaleId = INTERNAL_HELPER_OBJECT_ID
    this.canvas.add(helperObject)
    helperObject.sendToBack()
  }
  private syncSceneCoords(): void {
    for (const sceneObject of this.canvas.getObjects()) {
      sceneObject.setCoords()
    }
  }
  private handleContextMenuTarget(targetObject: EngineFabricObject | undefined): void {
    if (this.mode !== EngineMode.Idle || !targetObject?.sqaleId || !targetObject.sqaleType) {
      this.callbacks.onLayerContextMenuRequested?.(null)
      return
    }

    const draftTarget = targetObject as EngineFabricObject & DraftHandleObject
    if (draftTarget.sqaleDraftKind || targetObject.sqaleId === INTERNAL_HELPER_OBJECT_ID) {
      this.callbacks.onLayerContextMenuRequested?.(null)
      return
    }

    this.canvas.setActiveObject(targetObject)
    this.canvas.requestRenderAll()
    this.callbacks.onSelectionChanged?.(targetObject.sqaleId)
    this.callbacks.onLayerContextMenuRequested?.(targetObject.sqaleId)
  }
  private syncStackingOrder(): void {
    if (!this.floor) {
      return
    }

    const helperObject = this.findControlsHelperObject()
    let stackIndex = 0
    if (helperObject) {
      this.canvas.moveTo(helperObject, 0)
      stackIndex = 1
    }

    if (this.floor.planImage) {
      const planObject = this.objectById.get(this.floor.planImage.id)
      if (planObject) {
        this.canvas.moveTo(planObject, stackIndex)
        stackIndex += 1
      }
    }

    for (const room of this.floor.rooms) {
      const roomObject = this.objectById.get(room.id)
      if (!roomObject) {
        continue
      }
      this.canvas.moveTo(roomObject, stackIndex)
      stackIndex += 1
    }

    for (const furniture of this.floor.furnitures) {
      const furnitureObject = this.objectById.get(furniture.id)
      if (!furnitureObject) {
        continue
      }
      this.canvas.moveTo(furnitureObject, stackIndex)
      stackIndex += 1
    }

    this.canvas.requestRenderAll()
  }
  private findControlsHelperObject(): EngineFabricObject | null {
    for (const canvasObject of this.canvas.getObjects()) {
      const objectWithId = canvasObject as EngineFabricObject
      if (objectWithId.sqaleId === INTERNAL_HELPER_OBJECT_ID) {
        return objectWithId
      }
    }

    return null
  }
}
