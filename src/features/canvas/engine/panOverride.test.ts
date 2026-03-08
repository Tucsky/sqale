import { describe, expect, it } from 'vitest'

import { shouldStartMousePanOverride } from '@/features/canvas/engine/panOverride'
import { EngineMode } from '@/types/domain'

describe('shouldStartMousePanOverride', () => {
  it('returns false in idle mode', () => {
    expect(shouldStartMousePanOverride(EngineMode.Idle, { button: 2, altKey: false, metaKey: false })).toBe(false)
  })

  it('allows right drag in authoring modes', () => {
    expect(shouldStartMousePanOverride(EngineMode.DrawRoom, { button: 2, altKey: false, metaKey: false })).toBe(true)
    expect(shouldStartMousePanOverride(EngineMode.CalibrateScale, { button: 2, altKey: false, metaKey: false })).toBe(true)
    expect(shouldStartMousePanOverride(EngineMode.MeasureDistance, { button: 2, altKey: false, metaKey: false })).toBe(true)
  })

  it('allows alt + left drag in authoring modes', () => {
    expect(shouldStartMousePanOverride(EngineMode.DrawRoom, { button: 0, altKey: true, metaKey: false })).toBe(true)
  })

  it('does not treat plain left click as pan override', () => {
    expect(shouldStartMousePanOverride(EngineMode.DrawRoom, { button: 0, altKey: false, metaKey: false })).toBe(false)
  })
})
