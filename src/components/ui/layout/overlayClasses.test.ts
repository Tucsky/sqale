import { describe, expect, it } from 'vitest'

import {
  DESKTOP_DIALOG_SURFACE_CLASS,
  MOBILE_DIALOG_SURFACE_CLASS,
  VIEWPORT_BOUNDED_POPUP_CLASS,
} from '@/components/ui/layout/overlayClasses'

describe('overlay responsive class contracts', () => {
  it('bounds popup menus to viewport height with internal vertical scrolling', () => {
    expect(VIEWPORT_BOUNDED_POPUP_CLASS).toContain('max-h-[calc(100dvh-1rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))]')
    expect(VIEWPORT_BOUNDED_POPUP_CLASS).toContain('overflow-y-auto')
    expect(VIEWPORT_BOUNDED_POPUP_CLASS).toContain('overflow-x-hidden')
  })

  it('anchors dialogs for mobile viewport-safe scrolling', () => {
    expect(MOBILE_DIALOG_SURFACE_CLASS).toContain('inset-x-3')
    expect(MOBILE_DIALOG_SURFACE_CLASS).toContain('top-[calc(env(safe-area-inset-top)+0.75rem)]')
    expect(MOBILE_DIALOG_SURFACE_CLASS).toContain('overflow-y-auto')
    expect(MOBILE_DIALOG_SURFACE_CLASS).not.toContain('-translate-y-1/2')
  })

  it('restores centered desktop dialog placement', () => {
    expect(DESKTOP_DIALOG_SURFACE_CLASS).toContain('sm:-translate-y-1/2')
    expect(DESKTOP_DIALOG_SURFACE_CLASS).toContain('sm:-translate-x-1/2')
    expect(DESKTOP_DIALOG_SURFACE_CLASS).toContain('sm:max-w-lg')
  })
})
