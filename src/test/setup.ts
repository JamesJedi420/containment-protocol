import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { vi } from 'vitest'
import { cleanupFakeTimers } from './timers'

const STRICT_TEST_CONSOLE =
  String(process.env.STRICT_TEST_CONSOLE ?? '').toLowerCase() === '1' ||
  String(process.env.STRICT_TEST_CONSOLE ?? '').toLowerCase() === 'true'

let unexpectedConsoleCalls: string[] = []

if (STRICT_TEST_CONSOLE) {
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    unexpectedConsoleCalls.push(`console.error: ${args.map((arg) => String(arg)).join(' ')}`)
  })
  vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    unexpectedConsoleCalls.push(`console.warn: ${args.map((arg) => String(arg)).join(' ')}`)
  })
}

// In vitest vmThreads + jsdom, `localStorage` (global) may not expose Storage
// methods.  Providing a simple in-memory shim ensures components and tests
// share the same Storage instance.
function makeStorage() {
  const store: Record<string, string> = {}
  return {
    getItem: (key: string): string | null => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value)
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k]
    },
    get length() {
      return Object.keys(store).length
    },
    key: (n: number) => Object.keys(store)[n] ?? null,
  }
}

if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') {
  ;(globalThis as Record<string, unknown>).localStorage = makeStorage()
  ;(globalThis as Record<string, unknown>).sessionStorage = makeStorage()
}

beforeEach(() => {
  unexpectedConsoleCalls = []

  if (typeof localStorage.clear === 'function') {
    localStorage.clear()
  }

  if (typeof sessionStorage?.clear === 'function') {
    sessionStorage.clear()
  }
})

afterEach(() => {
  if (STRICT_TEST_CONSOLE && unexpectedConsoleCalls.length > 0) {
    const details = unexpectedConsoleCalls.join('\n')
    unexpectedConsoleCalls = []
    throw new Error(`Unexpected console output in test:\n${details}`)
  }

  cleanup()
  cleanupFakeTimers()
  vi.restoreAllMocks()
})
