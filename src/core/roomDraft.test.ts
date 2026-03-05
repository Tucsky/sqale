import { describe, expect, it } from 'vitest'

import { getDraftRoomAreaSqm } from '@/core/roomDraft'

describe('roomDraft', () => {
  it('returns zero until the polygon is closed', () => {
    const areaSqm = getDraftRoomAreaSqm(
      [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 3 },
        { x: 0, y: 3 },
      ],
      false,
    )

    expect(areaSqm).toBe(0)
  })

  it('returns polygon area after closure', () => {
    const areaSqm = getDraftRoomAreaSqm(
      [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 3 },
        { x: 0, y: 3 },
      ],
      true,
    )

    expect(areaSqm).toBe(12)
  })
})
