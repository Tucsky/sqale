export const DEFAULT_FURNITURE_FILL_COLOR = '#0f766e'
export const FURNITURE_FILL_ALPHA = 0.8

const STROKE_BRIGHTNESS_RATIO = 0.35

interface RgbColor {
  red: number
  green: number
  blue: number
}

/**
 * Converts a furniture base color into stable canvas paint values.
 * Fill alpha stays fixed to keep object readability across zoom levels.
 */
export function buildFurniturePaint(fillColor: string | null | undefined): {
  fillColor: string
  strokeColor: string
  baseColor: string
} {
  const baseColor = normalizeFurnitureFillColor(fillColor)
  const rgb = parseHexColor(baseColor)
  const strokeColor = rgbToHex({
    red: brightenChannel(rgb.red, STROKE_BRIGHTNESS_RATIO),
    green: brightenChannel(rgb.green, STROKE_BRIGHTNESS_RATIO),
    blue: brightenChannel(rgb.blue, STROKE_BRIGHTNESS_RATIO),
  })

  return {
    baseColor,
    fillColor: `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, ${FURNITURE_FILL_ALPHA})`,
    strokeColor,
  }
}

export function normalizeFurnitureFillColor(fillColor: string | null | undefined): string {
  if (typeof fillColor !== 'string') {
    return DEFAULT_FURNITURE_FILL_COLOR
  }

  const trimmedColor = fillColor.trim().toLowerCase()
  if (trimmedColor.length === 7 && trimmedColor[0] === '#' && isHexColorValue(trimmedColor, 1)) {
    return trimmedColor
  }

  if (trimmedColor.length === 4 && trimmedColor[0] === '#' && isHexColorValue(trimmedColor, 1)) {
    const red = trimmedColor[1]
    const green = trimmedColor[2]
    const blue = trimmedColor[3]
    return `#${red}${red}${green}${green}${blue}${blue}`
  }

  return DEFAULT_FURNITURE_FILL_COLOR
}

function parseHexColor(hexColor: string): RgbColor {
  return {
    red: Number.parseInt(hexColor.slice(1, 3), 16),
    green: Number.parseInt(hexColor.slice(3, 5), 16),
    blue: Number.parseInt(hexColor.slice(5, 7), 16),
  }
}

function rgbToHex(rgbColor: RgbColor): string {
  return `#${toHexPair(rgbColor.red)}${toHexPair(rgbColor.green)}${toHexPair(rgbColor.blue)}`
}

function toHexPair(channel: number): string {
  return channel.toString(16).padStart(2, '0')
}

function brightenChannel(channel: number, ratio: number): number {
  return Math.min(255, Math.round(channel + (255 - channel) * ratio))
}

function isHexColorValue(value: string, startIndex: number): boolean {
  for (let index = startIndex; index < value.length; index += 1) {
    const character = value[index]
    if (!character) {
      return false
    }

    const code = character.charCodeAt(0)
    const isNumber = code >= 48 && code <= 57
    const isLowercaseLetter = code >= 97 && code <= 102
    if (!isNumber && !isLowercaseLetter) {
      return false
    }
  }

  return true
}
