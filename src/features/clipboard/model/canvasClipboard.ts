import type { FurnitureModel } from '@/types/domain'

interface CanvasClipboardCallbacks {
  deleteSelection: () => void
  pasteFurniture: (sourceFurniture: FurnitureModel) => void
  pasteImage: (imageFile: File) => Promise<void>
  readSelectedFurniture: () => FurnitureModel | null
}

interface CanvasClipboardBindings {
  onCopy: (event: ClipboardEvent) => void
  onKeyDown: (event: KeyboardEvent) => void
  onPaste: (event: ClipboardEvent) => void
}

interface ShortcutEventLike {
  ctrlKey: boolean
  key: string
  metaKey: boolean
}

const FURNITURE_CLIPBOARD_MIME = 'application/x-sqale-furniture+json'
const FURNITURE_CLIPBOARD_TEXT_PREFIX = 'sqale:furniture:'

export function isCopyShortcut(event: ShortcutEventLike): boolean {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c'
}

export function isDeleteShortcut(event: ShortcutEventLike): boolean {
  if (event.key === 'Delete') {
    return true
  }
  return event.metaKey && event.key === 'Backspace'
}

export function createCanvasClipboardBindings(callbacks: CanvasClipboardCallbacks): CanvasClipboardBindings {
  let copiedFurniture: FurnitureModel | null = null
  let pendingInternalPaste = false

  const onCopy = (event: ClipboardEvent): void => {
    if (isEditableEventTarget(event.target)) {
      return
    }

    const selectedFurniture = callbacks.readSelectedFurniture()
    if (!selectedFurniture) {
      return
    }

    copiedFurniture = selectedFurniture
    pendingInternalPaste = true
    if (!event.clipboardData) {
      return
    }

    writeFurnitureToClipboardData(event.clipboardData, selectedFurniture)
    event.preventDefault()
  }

  const onKeyDown = (event: KeyboardEvent): void => {
    if (isEditableEventTarget(event.target)) {
      return
    }
    if (isCopyShortcut(event)) {
      const selectedFurniture = callbacks.readSelectedFurniture()
      if (!selectedFurniture) {
        return
      }
      copiedFurniture = selectedFurniture
      pendingInternalPaste = true
      return
    }
    if (!isDeleteShortcut(event)) {
      return
    }
    callbacks.deleteSelection()
    event.preventDefault()
  }

  const onPaste = (event: ClipboardEvent): void => {
    if (isEditableEventTarget(event.target)) {
      return
    }

    const copiedFurnitureFromClipboard = readFurnitureFromClipboardData(event.clipboardData)
    if (copiedFurnitureFromClipboard) {
      copiedFurniture = copiedFurnitureFromClipboard
      pendingInternalPaste = false
      event.preventDefault()
      callbacks.pasteFurniture(copiedFurnitureFromClipboard)
      return
    }

    if (pendingInternalPaste && copiedFurniture) {
      pendingInternalPaste = false
      event.preventDefault()
      callbacks.pasteFurniture(copiedFurniture)
      return
    }

    const pastedImage = findPastedImageFile(event)
    if (pastedImage) {
      copiedFurniture = null
      pendingInternalPaste = false
      event.preventDefault()
      void callbacks.pasteImage(pastedImage)
      return
    }
  }

  return { onCopy, onKeyDown, onPaste }
}

function isEditableEventTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined') {
    return false
  }
  if (!(target instanceof HTMLElement)) {
    return false
  }
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

function findPastedImageFile(event: ClipboardEvent): File | null {
  const clipboardItems = event.clipboardData?.items
  if (!clipboardItems) {
    return null
  }
  for (let itemIndex = 0; itemIndex < clipboardItems.length; itemIndex += 1) {
    const clipboardItem = clipboardItems[itemIndex]
    if (!clipboardItem || clipboardItem.kind !== 'file' || !clipboardItem.type.startsWith('image/')) {
      continue
    }
    const imageFile = clipboardItem.getAsFile()
    if (imageFile) {
      return imageFile
    }
  }
  return null
}

function writeFurnitureToClipboardData(clipboardData: DataTransfer, furniture: FurnitureModel): void {
  const jsonPayload = JSON.stringify(furniture)
  clipboardData.setData(FURNITURE_CLIPBOARD_MIME, jsonPayload)
  clipboardData.setData('text/plain', `${FURNITURE_CLIPBOARD_TEXT_PREFIX}${jsonPayload}`)
}

function readFurnitureFromClipboardData(clipboardData: DataTransfer | null): FurnitureModel | null {
  if (!clipboardData) {
    return null
  }

  const customPayload = clipboardData.getData(FURNITURE_CLIPBOARD_MIME)
  const furnitureFromCustomPayload = parseFurniturePayload(customPayload)
  if (furnitureFromCustomPayload) {
    return furnitureFromCustomPayload
  }

  const plainTextPayload = clipboardData.getData('text/plain')
  if (!plainTextPayload.startsWith(FURNITURE_CLIPBOARD_TEXT_PREFIX)) {
    return null
  }

  return parseFurniturePayload(plainTextPayload.slice(FURNITURE_CLIPBOARD_TEXT_PREFIX.length))
}

function parseFurniturePayload(payload: string): FurnitureModel | null {
  if (!payload) {
    return null
  }

  try {
    const parsedPayload: unknown = JSON.parse(payload)
    return isFurnitureModel(parsedPayload) ? parsedPayload : null
  } catch {
    return null
  }
}

function isFurnitureModel(value: unknown): value is FurnitureModel {
  if (!isRecord(value)) {
    return false
  }

  const position = value.position
  return (
    typeof value.id === 'string'
    && typeof value.label === 'string'
    && typeof value.fillColor === 'string'
    && isRecord(position)
    && typeof position.x === 'number'
    && typeof position.y === 'number'
    && typeof value.widthMeters === 'number'
    && typeof value.depthMeters === 'number'
    && typeof value.rotationDeg === 'number'
    && (typeof value.roomId === 'string' || value.roomId === null)
    && typeof value.opacity === 'number'
    && typeof value.locked === 'boolean'
    && typeof value.visible === 'boolean'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
