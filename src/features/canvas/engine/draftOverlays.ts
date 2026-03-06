import { fabric } from 'fabric'

import { distanceMeters } from '@/features/canvas/math/geometry'

type DraftHandleKind = 'room' | 'calibration'
type DraftPoint = { x: number; y: number }

export interface DraftHandleObject extends fabric.Circle {
  sqaleDraftIndex?: number
  sqaleDraftKind?: DraftHandleKind
}

const HANDLE_RADIUS_PX = 6
const ROOM_CLOSE_THRESHOLD_METERS = 0.3

export class DraftOverlays {
  private roomClosed = false
  private roomDraftPolyline: fabric.Polyline | null = null
  private roomDraftHandles: DraftHandleObject[] = []

  private calibrationLine: fabric.Line | null = null
  private calibrationHandles: DraftHandleObject[] = []

  isRoomClosed(): boolean {
    return this.roomClosed
  }

  resetRoom(canvas: fabric.Canvas): void {
    this.roomClosed = false
    this.clearRoomDraftOverlay(canvas)
  }

  resetCalibration(canvas: fabric.Canvas): void {
    this.clearCalibrationOverlay(canvas)
  }

  resetAll(canvas: fabric.Canvas): void {
    this.resetRoom(canvas)
    this.resetCalibration(canvas)
  }

  placeRoomPoint(canvas: fabric.Canvas, draftRoomPoints: DraftPoint[], pointer: DraftPoint): void {
    if (this.roomClosed) {
      return
    }

    const firstPoint = draftRoomPoints[0]
    if (firstPoint && draftRoomPoints.length >= 3) {
      const closeDistance = distanceMeters(firstPoint, pointer)
      if (closeDistance <= ROOM_CLOSE_THRESHOLD_METERS) {
        this.roomClosed = true
        this.renderRoomDraftOverlay(canvas, draftRoomPoints)
        return
      }
    }

    draftRoomPoints.push(pointer)
    this.renderRoomDraftOverlay(canvas, draftRoomPoints)
  }

  closeRoomFromHandle(canvas: fabric.Canvas, draftRoomPoints: DraftPoint[], handleIndex: number | undefined): boolean {
    if (this.roomClosed || handleIndex !== 0 || draftRoomPoints.length < 3) {
      return false
    }

    this.roomClosed = true
    this.renderRoomDraftOverlay(canvas, draftRoomPoints)
    return true
  }

  placeCalibrationPoint(canvas: fabric.Canvas, calibrationPoints: DraftPoint[], pointer: DraftPoint): void {
    if (calibrationPoints.length >= 2) {
      return
    }

    calibrationPoints.push(pointer)
    this.renderCalibrationOverlay(canvas, calibrationPoints)
  }

  syncRoomDraftHandle(canvas: fabric.Canvas, draftRoomPoints: DraftPoint[], handleObject: DraftHandleObject): void {
    const handleIndex = handleObject.sqaleDraftIndex
    if (handleIndex === undefined || !draftRoomPoints[handleIndex]) {
      return
    }

    draftRoomPoints[handleIndex] = {
      x: handleObject.left ?? 0,
      y: handleObject.top ?? 0,
    }

    if (!this.roomDraftPolyline) {
      return
    }

    this.roomDraftPolyline.set({
      points: this.toFabricPoints(this.getRoomPreviewPoints(draftRoomPoints)),
    })
    this.roomDraftPolyline.setCoords()
    canvas.requestRenderAll()
  }

  syncCalibrationDraftHandle(
    canvas: fabric.Canvas,
    calibrationPoints: DraftPoint[],
    handleObject: DraftHandleObject,
  ): void {
    const handleIndex = handleObject.sqaleDraftIndex
    if (handleIndex === undefined || !calibrationPoints[handleIndex]) {
      return
    }

    calibrationPoints[handleIndex] = {
      x: handleObject.left ?? 0,
      y: handleObject.top ?? 0,
    }

    const firstPoint = calibrationPoints[0]
    const secondPoint = calibrationPoints[1] ?? firstPoint
    if (!firstPoint || !secondPoint || !this.calibrationLine) {
      return
    }

    this.calibrationLine.set({
      x1: firstPoint.x,
      y1: firstPoint.y,
      x2: secondPoint.x,
      y2: secondPoint.y,
    })
    this.calibrationLine.setCoords()
    canvas.requestRenderAll()
  }

  isDraftHandle(
    targetObject: fabric.Object | undefined,
    expectedKind: DraftHandleKind,
  ): targetObject is DraftHandleObject {
    if (!targetObject) {
      return false
    }

    const draftTarget = targetObject as DraftHandleObject
    return draftTarget.sqaleDraftKind === expectedKind
  }

  private renderRoomDraftOverlay(canvas: fabric.Canvas, draftRoomPoints: DraftPoint[]): void {
    this.clearRoomDraftOverlay(canvas)
    if (draftRoomPoints.length === 0) {
      return
    }

    this.roomDraftPolyline = new fabric.Polyline(this.toFabricPoints(this.getRoomPreviewPoints(draftRoomPoints)), {
      fill: this.roomClosed ? 'rgba(56, 189, 248, 0.14)' : 'rgba(56, 189, 248, 0.06)',
      stroke: '#0284c7',
      strokeWidth: 0.01,
      selectable: false,
      evented: false,
      objectCaching: false,
    })
    canvas.add(this.roomDraftPolyline)

    this.roomDraftHandles = draftRoomPoints.map((draftPoint, index) =>
      this.createDraftHandle(canvas, draftPoint.x, draftPoint.y, index, 'room', '#0284c7'),
    )

    for (const handle of this.roomDraftHandles) {
      canvas.add(handle)
    }

    canvas.requestRenderAll()
  }

  private renderCalibrationOverlay(canvas: fabric.Canvas, calibrationPoints: DraftPoint[]): void {
    this.clearCalibrationOverlay(canvas)
    if (calibrationPoints.length === 0) {
      return
    }

    const firstPoint = calibrationPoints[0]
    const secondPoint = calibrationPoints[1] ?? firstPoint
    if (!firstPoint || !secondPoint) {
      return
    }

    this.calibrationLine = new fabric.Line([firstPoint.x, firstPoint.y, secondPoint.x, secondPoint.y], {
      stroke: '#f59e0b',
      strokeWidth: 0.04,
      selectable: false,
      evented: false,
      objectCaching: false,
    })
    canvas.add(this.calibrationLine)

    this.calibrationHandles = calibrationPoints.map((calibrationPoint, index) =>
      this.createDraftHandle(canvas, calibrationPoint.x, calibrationPoint.y, index, 'calibration', '#f59e0b'),
    )

    for (const handle of this.calibrationHandles) {
      canvas.add(handle)
    }

    canvas.requestRenderAll()
  }

  private createDraftHandle(
    canvas: fabric.Canvas,
    x: number,
    y: number,
    index: number,
    kind: DraftHandleKind,
    strokeColor: string,
  ): DraftHandleObject {
    const handleRadius = HANDLE_RADIUS_PX / Math.max(canvas.getZoom(), 0.001)
    const handle = new fabric.Circle({
      left: x,
      top: y,
      originX: 'center',
      originY: 'center',
      radius: handleRadius,
      fill: '#ffffff',
      stroke: strokeColor,
      strokeWidth: 0.03,
      selectable: true,
      evented: true,
      hasBorders: false,
      hasControls: false,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
      objectCaching: false,
    }) as DraftHandleObject

    handle.sqaleDraftKind = kind
    handle.sqaleDraftIndex = index
    return handle
  }

  private getRoomPreviewPoints(draftRoomPoints: DraftPoint[]): DraftPoint[] {
    if (!this.roomClosed || draftRoomPoints.length < 3) {
      return draftRoomPoints
    }

    const firstPoint = draftRoomPoints[0]
    return firstPoint ? [...draftRoomPoints, firstPoint] : draftRoomPoints
  }

  private toFabricPoints(points: DraftPoint[]): fabric.Point[] {
    return points.map((point) => new fabric.Point(point.x, point.y))
  }

  private clearRoomDraftOverlay(canvas: fabric.Canvas): void {
    if (this.roomDraftPolyline) {
      canvas.remove(this.roomDraftPolyline)
      this.roomDraftPolyline = null
    }

    for (const handle of this.roomDraftHandles) {
      canvas.remove(handle)
    }
    this.roomDraftHandles = []
  }

  private clearCalibrationOverlay(canvas: fabric.Canvas): void {
    if (this.calibrationLine) {
      canvas.remove(this.calibrationLine)
      this.calibrationLine = null
    }

    for (const handle of this.calibrationHandles) {
      canvas.remove(handle)
    }
    this.calibrationHandles = []
  }
}
