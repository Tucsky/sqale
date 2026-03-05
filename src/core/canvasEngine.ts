import { fabric } from 'fabric'

import { snapValue, type EngineFabricObject } from '@/core/canvasObjects'
import { DraftOverlays, type DraftHandleObject } from '@/core/draftOverlays'
import { distanceMeters } from '@/core/geometry'
import { panViewport, zoomFromWheel } from '@/core/viewport'
import { EngineMode, LayerType } from '@/types/domain'

import { CanvasEngineCore, type CanvasEngineCallbacks } from './canvasEngineCore'

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
  }

  override startRoomDrawing(): void {
    super.startRoomDrawing()
    this.draftOverlays.resetRoom(this.canvas)
    this.activateSketchMode()
  }

  override cancelRoomDrawing(): void {
    super.cancelRoomDrawing()
    this.draftOverlays.resetRoom(this.canvas)
    this.deactivateSketchMode()
  }

  override commitRoom(name: string): void {
    if (this.draftRoomPoints.length < 3) {
      return
    }

    super.commitRoom(name)
    this.draftOverlays.resetRoom(this.canvas)
    this.deactivateSketchMode()
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

  private bindCanvasEvents(): void {
    this.canvas.on('mouse:wheel', this.onMouseWheel)
    this.canvas.on('mouse:down', this.onMouseDown)
    this.canvas.on('mouse:move', this.onMouseMove)
    this.canvas.on('mouse:up', this.onMouseUp)

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
    const pointer = this.canvas.getPointer(event.e)

    if (this.mode === EngineMode.DrawRoom) {
      if (this.draftOverlays.isDraftHandle(event.target, 'room')) {
        this.draftOverlays.closeRoomFromHandle(this.canvas, this.draftRoomPoints, event.target.sqaleDraftIndex)
        return
      }

      this.draftOverlays.placeRoomPoint(this.canvas, this.draftRoomPoints, { x: pointer.x, y: pointer.y })
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
}
