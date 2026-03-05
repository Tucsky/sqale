import { createId } from '@/lib/utils'
import type { PlanImageModel } from '@/types/domain'

export async function readFileAsDataUrl(file: File): Promise<string> {
  const reader = new FileReader()
  return new Promise<string>((resolve, reject) => {
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Could not read image file'))
      }
    }
    reader.onerror = () => reject(reader.error ?? new Error('Image upload failed'))
    reader.readAsDataURL(file)
  })
}

export function createPlanImageModel(dataUrl: string, name: string): PlanImageModel {
  return {
    id: createId('plan'),
    name,
    dataUrl,
    position: { x: 0, y: 0 },
    rotationDeg: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    locked: false,
    visible: true,
  }
}

export function buildFloorNameFromImageFile(fileName: string, floorCount: number): string {
  const normalizedName = fileName.trim()
  if (!normalizedName) {
    return `Floor ${floorCount + 1}`
  }
  const extensionSeparator = normalizedName.lastIndexOf('.')
  const baseName = extensionSeparator > 0 ? normalizedName.slice(0, extensionSeparator) : normalizedName
  return baseName || `Floor ${floorCount + 1}`
}
