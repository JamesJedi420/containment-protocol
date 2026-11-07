import '../test/setup'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderRecoveryScreen } from './renderRecovery'
import { dispatchInputAction, saveInputPreferences } from './inputRuntime'

beforeEach(() => {
  saveInputPreferences({ version: 1, overrides: {} })
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
})
describe('isolated recovery screen', () => {
  it('focuses one native action, preserves storage and reloads only on explicit activation', () => {
    const container = document.createElement('div')
    document.body.append(container)
    container.innerHTML = '<dialog open>Failed application dialog</dialog>'
    localStorage.setItem('containment-protocol-game-state', 'stored campaign bytes')
    const reload = vi.fn()
    const cleanup = renderRecoveryScreen(container, reload)
    try {
      const button = container.querySelector('button')!
      expect(document.activeElement).toBe(button)
      expect(container.querySelectorAll('button')).toHaveLength(1)
      expect(container.querySelector('[role="alert"]')).toHaveTextContent('could not display')
      expect(container.textContent).toContain('Unsaved changes may be lost')
      expect(container.textContent).toContain('integrity has not been checked')
      expect(reload).not.toHaveBeenCalled()
      expect(document.querySelector('dialog[open]')).toBeNull()
      window.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyR', altKey: true, shiftKey: true, bubbles: true })
      )
      button.click()
      expect(dispatchInputAction('recovery.reload')).toBe(false)
      expect(reload).toHaveBeenCalledTimes(1)
      expect(button).toBeDisabled()
      expect(localStorage.getItem('containment-protocol-game-state')).toBe('stored campaign bytes')
    } finally {
      cleanup()
      container.remove()
    }
  })
  it('retains native activation when device runtime setup is unavailable', () => {
    const removeListener = vi.spyOn(window, 'removeEventListener')
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => {
      throw new Error('device runtime unavailable')
    })
    const container = document.createElement('div')
    document.body.append(container)
    const reload = vi.fn()
    const cleanup = renderRecoveryScreen(container, reload)
    try {
      container.querySelector('button')!.click()
      expect(reload).toHaveBeenCalledTimes(1)
      expect(removeListener).toHaveBeenCalledWith('keydown', expect.any(Function))
    } finally {
      cleanup()
      container.remove()
    }
  })
})
