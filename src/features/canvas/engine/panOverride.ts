import { EngineMode, type EngineMode as EngineModeValue } from '@/types/domain'

export function isAuthoringMode(mode: EngineModeValue): boolean {
  return mode === EngineMode.DrawRoom
    || mode === EngineMode.CalibrateScale
    || mode === EngineMode.MeasureDistance
}

/**
 * Pan override during authoring modes:
 * - Alt + left drag
 * - middle mouse drag
 * - right mouse drag
 */
export function shouldStartMousePanOverride(
  mode: EngineModeValue,
  pointerInput: Pick<MouseEvent, 'button' | 'altKey' | 'metaKey'>,
): boolean {
  if (!isAuthoringMode(mode)) {
    return false
  }

  if (pointerInput.button === 1 || pointerInput.button === 2) {
    return true
  }

  return pointerInput.button === 0 && (pointerInput.altKey || pointerInput.metaKey)
}
