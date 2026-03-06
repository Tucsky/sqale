import { describe, expect, it, vi } from 'vitest'

import { registerHmrCanvasRecovery } from './hmrRecovery'

describe('registerHmrCanvasRecovery', () => {
  it('registers a before-update handler that reloads the page', () => {
    const callbackHolder: { beforeUpdate?: () => void } = {}
    const reload = vi.fn()
    const hot = {
      on(event: 'vite:beforeUpdate', callback: () => void) {
        expect(event).toBe('vite:beforeUpdate')
        callbackHolder.beforeUpdate = callback
      },
    }

    registerHmrCanvasRecovery(hot, { reload })
    expect(callbackHolder.beforeUpdate).toBeDefined()
    callbackHolder.beforeUpdate?.()

    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('does nothing when hot context is missing', () => {
    const reload = vi.fn()

    registerHmrCanvasRecovery(undefined, { reload })

    expect(reload).not.toHaveBeenCalled()
  })
})
