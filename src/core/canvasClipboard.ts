import type { FurnitureModel } from '@/types/domain'

interface CanvasClipboardCallbacks {
  deleteSelection: () => void
  pasteFurniture: (sourceFurniture: FurnitureModel) => void
  pasteImage: (imageFile: File) => Promise<void>
  readSelectedFurniture: () => FurnitureModel | null
}

interface CanvasClipboardBindings {
  onKeyDown: (event: KeyboardEvent) => void
  onPaste: (event: ClipboardEvent) => void
}

interface ShortcutEventLike {
  ctrlKey: boolean
  key: string
  metaKey: boolean
}

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
      event.preventDefault()
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
    const pastedImage = findPastedImageFile(event)
    if (pastedImage) {
      event.preventDefault()
      void callbacks.pasteImage(pastedImage)
      return
    }
    if (!copiedFurniture) {
      return
    }
    event.preventDefault()
    callbacks.pasteFurniture(copiedFurniture)
  }

  return { onKeyDown, onPaste }
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
