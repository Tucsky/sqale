import { describe, expect, it } from 'vitest'

import {
  ThemeMode,
  applyStoredThemeMode,
  applyThemeMode,
  parseThemeMode,
  persistThemeMode,
  readThemeMode,
} from '@/lib/theme'

interface StorageFixture extends Pick<Storage, 'getItem' | 'setItem'> {
  readStoredValue: () => string | null
}

interface ThemeRootFixture {
  classList: Pick<HTMLElement['classList'], 'toggle'>
  hasDarkClass: () => boolean
}

function createStorageFixture(initialValue: string | null): StorageFixture {
  let storedValue = initialValue

  return {
    getItem(_key: string): string | null {
      return storedValue
    },
    setItem(_key: string, value: string): void {
      storedValue = value
    },
    readStoredValue(): string | null {
      return storedValue
    },
  }
}

function createThemeRootFixture(initiallyDark: boolean): ThemeRootFixture {
  const classes = new Set<string>(initiallyDark ? ['dark'] : [])

  return {
    classList: {
      toggle(token: string, force?: boolean): boolean {
        if (force === undefined) {
          if (classes.has(token)) {
            classes.delete(token)
            return false
          }
          classes.add(token)
          return true
        }

        if (force) {
          classes.add(token)
        } else {
          classes.delete(token)
        }

        return classes.has(token)
      },
    },
    hasDarkClass(): boolean {
      return classes.has('dark')
    },
  }
}

describe('theme utilities', () => {
  it('parses persisted mode with a safe light fallback', () => {
    expect(parseThemeMode(ThemeMode.Dark)).toBe(ThemeMode.Dark)
    expect(parseThemeMode(ThemeMode.Light)).toBe(ThemeMode.Light)
    expect(parseThemeMode('unexpected')).toBe(ThemeMode.Light)
    expect(parseThemeMode(null)).toBe(ThemeMode.Light)
  })

  it('reads and persists theme mode in storage', () => {
    const storage = createStorageFixture(null)

    expect(readThemeMode(storage)).toBe(ThemeMode.Light)
    persistThemeMode(storage, ThemeMode.Dark)
    expect(storage.readStoredValue()).toBe(ThemeMode.Dark)
    expect(readThemeMode(storage)).toBe(ThemeMode.Dark)
  })

  it('applies dark class from stored mode and returns the resolved mode', () => {
    const root = createThemeRootFixture(false)
    const darkStorage = createStorageFixture(ThemeMode.Dark)
    const lightStorage = createStorageFixture(ThemeMode.Light)

    expect(applyStoredThemeMode(root, darkStorage)).toBe(ThemeMode.Dark)
    expect(root.hasDarkClass()).toBe(true)

    expect(applyStoredThemeMode(root, lightStorage)).toBe(ThemeMode.Light)
    expect(root.hasDarkClass()).toBe(false)
  })

  it('updates root class when mode changes explicitly', () => {
    const root = createThemeRootFixture(false)

    applyThemeMode(root, ThemeMode.Dark)
    expect(root.hasDarkClass()).toBe(true)

    applyThemeMode(root, ThemeMode.Light)
    expect(root.hasDarkClass()).toBe(false)
  })
})
