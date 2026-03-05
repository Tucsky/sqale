import type { FloorModel } from '@/types/domain'

/**
 * FloorModel is intentionally JSON-safe. JSON cloning strips Vue proxies and
 * prevents DataCloneError from structuredClone on browser host objects.
 */
export function cloneFloorModel(floor: FloorModel): FloorModel {
  return JSON.parse(JSON.stringify(floor)) as FloorModel
}
