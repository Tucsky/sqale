export const ThemeMode = {
  Light: 'light',
  Dark: 'dark',
} as const

export type ThemeMode = (typeof ThemeMode)[keyof typeof ThemeMode]

const THEME_MODE_STORAGE_KEY = 'sqale-theme-mode'

type ThemeStorageReader = Pick<Storage, 'getItem'>
type ThemeStorageWriter = Pick<Storage, 'setItem'>
type ThemeRoot = {
  classList: Pick<HTMLElement['classList'], 'toggle'>
}

/**
 * Normalizes persisted theme data to a supported mode.
 */
export function parseThemeMode(value: string | null): ThemeMode {
  if (value === ThemeMode.Dark) {
    return ThemeMode.Dark
  }

  return ThemeMode.Light
}

/**
 * Reads theme mode from storage, defaulting to light when missing or unavailable.
 */
export function readThemeMode(storage: ThemeStorageReader | null): ThemeMode {
  if (!storage) {
    return ThemeMode.Light
  }

  return parseThemeMode(storage.getItem(THEME_MODE_STORAGE_KEY))
}

/**
 * Persists theme mode in local storage.
 */
export function persistThemeMode(storage: ThemeStorageWriter | null, mode: ThemeMode): void {
  storage?.setItem(THEME_MODE_STORAGE_KEY, mode)
}

/**
 * Applies the current mode to the root element by toggling the Tailwind dark class.
 */
export function applyThemeMode(rootElement: ThemeRoot | null, mode: ThemeMode): void {
  if (!rootElement) {
    return
  }

  rootElement.classList.toggle('dark', mode === ThemeMode.Dark)
}

/**
 * Resolves browser localStorage safely for environments where storage may be unavailable.
 */
export function resolveThemeStorage(): ThemeStorageReader & ThemeStorageWriter | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * Loads persisted mode and applies it to the root element.
 * @returns The resolved theme mode after parsing persisted data.
 */
export function applyStoredThemeMode(
  rootElement: ThemeRoot | null,
  storage: ThemeStorageReader | null,
): ThemeMode {
  const resolvedMode = readThemeMode(storage)
  applyThemeMode(rootElement, resolvedMode)
  return resolvedMode
}
