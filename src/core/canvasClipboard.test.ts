import { describe, expect, it, vi } from 'vitest'

import { createCanvasClipboardBindings, isCopyShortcut, isDeleteShortcut } from '@/core/canvasClipboard'
import type { FurnitureModel } from '@/types/domain'

const furnitureFixture: FurnitureModel = {
  id: 'furniture_1',
  label: 'Desk',
  fillColor: '#0f766e',
  position: { x: 1, y: 2 },
  widthMeters: 1.2,
  depthMeters: 0.7,
  rotationDeg: 0,
  roomId: null,
  opacity: 1,
  locked: false,
  visible: true,
}

function createKeyboardEvent(overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    key: '',
    metaKey: false,
    ctrlKey: false,
    target: null,
    preventDefault: vi.fn(),
    ...overrides,
  } as unknown as KeyboardEvent
}

function createPasteEvent(overrides: Partial<ClipboardEvent> = {}): ClipboardEvent {
  return {
    target: null,
    clipboardData: undefined,
    preventDefault: vi.fn(),
    ...overrides,
  } as unknown as ClipboardEvent
}

describe('canvasClipboard shortcuts', () => {
  it('matches copy shortcuts for cmd/ctrl + c', () => {
    expect(isCopyShortcut({ key: 'c', metaKey: true, ctrlKey: false })).toBe(true)
    expect(isCopyShortcut({ key: 'C', metaKey: false, ctrlKey: true })).toBe(true)
    expect(isCopyShortcut({ key: 'v', metaKey: true, ctrlKey: false })).toBe(false)
  })

  it('matches delete shortcuts for Delete and cmd + Backspace', () => {
    expect(isDeleteShortcut({ key: 'Delete', metaKey: false, ctrlKey: false })).toBe(true)
    expect(isDeleteShortcut({ key: 'Backspace', metaKey: true, ctrlKey: false })).toBe(true)
    expect(isDeleteShortcut({ key: 'Backspace', metaKey: false, ctrlKey: false })).toBe(false)
  })
})

describe('createCanvasClipboardBindings', () => {
  it('deletes selection on Delete key', () => {
    const deleteSelection = vi.fn()
    const bindings = createCanvasClipboardBindings({
      deleteSelection,
      readSelectedFurniture: () => null,
      pasteFurniture: vi.fn(),
      pasteImage: vi.fn(async () => undefined),
    })

    const keyboardEvent = createKeyboardEvent({ key: 'Delete' })
    bindings.onKeyDown(keyboardEvent)

    expect(deleteSelection).toHaveBeenCalledTimes(1)
    expect(keyboardEvent.preventDefault).toHaveBeenCalledTimes(1)
  })

  it('deletes selection on cmd + Backspace', () => {
    const deleteSelection = vi.fn()
    const bindings = createCanvasClipboardBindings({
      deleteSelection,
      readSelectedFurniture: () => null,
      pasteFurniture: vi.fn(),
      pasteImage: vi.fn(async () => undefined),
    })

    const keyboardEvent = createKeyboardEvent({ key: 'Backspace', metaKey: true })
    bindings.onKeyDown(keyboardEvent)

    expect(deleteSelection).toHaveBeenCalledTimes(1)
    expect(keyboardEvent.preventDefault).toHaveBeenCalledTimes(1)
  })

  it('copies and pastes selected furniture', () => {
    const pasteFurniture = vi.fn()
    const bindings = createCanvasClipboardBindings({
      deleteSelection: vi.fn(),
      readSelectedFurniture: () => furnitureFixture,
      pasteFurniture,
      pasteImage: vi.fn(async () => undefined),
    })

    const copyEvent = createKeyboardEvent({ key: 'c', ctrlKey: true })
    bindings.onKeyDown(copyEvent)
    const pasteEvent = createPasteEvent()
    bindings.onPaste(pasteEvent)

    expect(copyEvent.preventDefault).toHaveBeenCalledTimes(1)
    expect(pasteEvent.preventDefault).toHaveBeenCalledTimes(1)
    expect(pasteFurniture).toHaveBeenCalledTimes(1)
    expect(pasteFurniture).toHaveBeenCalledWith(furnitureFixture)
  })
})
