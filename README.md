# Sqale

Sqale is a serverless single-page floor plan editor.

The app runs fully client-side: no backend, no API. All project data is persisted locally in IndexedDB.

## MVP scope

- Upload a floor plan image (`PNG`/`JPG`) as the plan layer.
- Move/rotate/resize the plan directly on canvas when unlocked, and adjust opacity in the object edit modal.
- Calibrate scale from two picked points and a known real-world distance.
- Draw editable room polygons and compute area (`m²`) with the shoelace formula.
- Show live room draft surface in the ongoing action bar once the polygon is closed.
- Add furniture as transformable rectangles (move/resize/rotate).
- Navigate with viewport pan + wheel zoom (viewport transform, not per-object moves).
- Show a meter-based grid overlay (`0.25`, `0.5`, `1` m) with optional snapping.
- Manage multiple floors (create/select/rename/delete) in local storage.
- Use a floating layers panel with context menu actions (show/hide, lock/unlock, edit, remove).
- Use a generic object edit modal (x/y, width/height, projected surface, opacity).
- Use a unified ongoing action bar for calibration, room drawing, and selected-object sizing.

## Tech stack

- Vue 3
- Vite
- TypeScript (strict)
- Tailwind CSS
- shadcn-vue UI primitives (Radix Vue track)
- Fabric.js
- idb (IndexedDB wrapper)
- lucide-vue-next icons

## Architecture

### UI layer (Vue components)

- `App.vue`: orchestrates dialogs, toolbar actions, and engine callbacks.
- `components/CanvasView.vue`: canvas mount + resize observer.
- `components/TopBar.vue`: layers visibility toggle.
- `components/Toolbar.vue`: top-left menubar for menu + core tools (upload/draw/furniture/calibration).
- `components/LayerPanel.vue`: floating layer tree with contextual actions and rename/edit flows.
- `components/OngoingActionBar.vue`: contextual action UI (calibration, room draft, selected object sizing).
- `components/dialogs/*`: scale calibration, floors, settings, generic object edit.

### Engine layer (Fabric, framework-independent)

`src/core/canvasEngine.ts` and `src/core/canvasEngineCore.ts` own Fabric interaction and scene state.

Responsibilities:

- Fabric canvas lifecycle and event wiring
- Plan/room/furniture object rendering
- Viewport transforms (pan/zoom)
- Draft overlays for room/calibration point editing
- Object selection + layer synchronization
- Grid rendering
- Scale and geometry updates back into floor models

Supporting modules:

- `canvasObjects.ts`: Fabric object factories and world-point extraction
- `draftOverlays.ts`: interactive room/calibration points
- `floorActions.ts`: pure floor mutations (calibration, transforms, lock/visibility/rename)
- `geometry.ts`, `scale.ts`: domain math
- `layerModel.ts`: layer tree projection
- `viewport.ts`, `viewportFit.ts`: camera behavior
- `floorClone.ts`: deterministic floor cloning for safe emits

### Storage layer

`src/storage/db.ts` uses IndexedDB via `idb`:

- `floors` store: serialized `FloorModel`
- `meta` store: current floor id

State is auto-saved from engine callbacks with a short debounce.

## Domain model (core)

`src/types/domain.ts` defines:

- `FloorModel`: `planImage`, `scale`, `grid`, `rooms`, `furnitures`
- `PlanImageModel`: transform (`position`, `rotation`, `scale`), opacity, visibility, lock state
- `RoomModel`: polygon points + computed area + opacity
- `FurnitureModel`: dimensions, position, rotation, room association, opacity
- `LayerNode`: tree model for the layers panel

All geometry is stored in world units (meters-based coordinates), with calibration driving `metersPerPixel`.

## Canvas engine API

Vue components interact with Fabric only through the engine API:

- `loadFloor(floor)`
- `updatePlanImage(planImage)`
- `startRoomDrawing()`, `cancelRoomDrawing()`, `commitRoom(name)`
- `startCalibration()`, `cancelCalibration()`, `setScale(realDistanceMeters)`
- `addFurniture(roomId?)`
- `getLayerEditSnapshot(id)`
- `selectObject(id)`
- `toggleVisibility(id)`, `toggleLock(id)`, `renameLayer(id, name)`, `deleteLayer(id)`
- `updateLayerFrame(id, x, y, width, height)`, `updateLayerOpacity(id, value)`
- `setGridVisible(value)`, `setGridSpacing(value)`, `setGridSnap(value)`
- `updatePlanOpacity(value)`, `rotatePlan(deltaDeg)`

## Run locally

```bash
npm install
npm run dev
```

## Verification

```bash
npm run typecheck
npm test
npm run build
```
