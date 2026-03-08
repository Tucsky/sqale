import { describe, expect, it } from 'vitest'

import { APP_ROOT_VIEWPORT_CLASS } from './viewportClasses'

describe('APP_ROOT_VIEWPORT_CLASS', () => {
  it('keeps a 100vh fallback and upgrades to dynamic viewport height when supported', () => {
    expect(APP_ROOT_VIEWPORT_CLASS).toContain('h-screen')
    expect(APP_ROOT_VIEWPORT_CLASS).toContain('supports-[height:100dvh]:h-dvh')
  })
})
