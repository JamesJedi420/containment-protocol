import { act } from '@testing-library/react'
import { vi } from 'vitest'

export type ClipboardWriteText = (text: string) => Promise<void>

export function mockClipboardWriteText(writeText: ClipboardWriteText) {
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })
}

export async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve()
  })
}

export function advanceFakeTimers(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

export function cleanupFakeTimers() {
  if (vi.isFakeTimers()) {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  }
}
