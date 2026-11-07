import '../test/setup'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { keyboardBinding } from './inputActions'
import {
  captureInput,
  clearInputBinding,
  dispatchInputAction,
  INPUT_PREFERENCES_KEY,
  installInputRuntime,
  keyboardInput,
  saveInputPreferences,
  startInputCapture,
  useInputConsumer,
  useInputPreferences,
} from './inputRuntime'

beforeEach(() => {
  saveInputPreferences({ version: 1, overrides: {} })
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('input runtime and device-local preferences', () => {
  it('uses physical positions across layouts and leaves native commands unconsumed during capture', () => {
    const execute = vi.fn()
    renderHook(() =>
      useInputConsumer({ id: 'settings.open', context: 'global', available: () => true, execute })
    )
    const stop = installInputRuntime()
    try {
      const alternateLayout = new KeyboardEvent('keydown', {
        code: 'KeyS',
        key: 'Í',
        altKey: true,
        shiftKey: true,
        cancelable: true,
      })
      window.dispatchEvent(alternateLayout)
      expect(execute).toHaveBeenCalledOnce()
      expect(alternateLayout.defaultPrevented).toBe(true)
      expect(keyboardInput(alternateLayout)).toEqual(keyboardBinding('s'))
      act(() => startInputCapture({ id: 'settings.open', device: 'keyboard' }))
      const copy = new KeyboardEvent('keydown', {
        code: 'KeyC',
        key: 'c',
        ctrlKey: true,
        cancelable: true,
      })
      act(() => window.dispatchEvent(copy))
      expect(copy.defaultPrevented).toBe(false)
      const noCode = new KeyboardEvent('keydown', {
        key: 's',
        altKey: true,
        shiftKey: true,
        cancelable: true,
      })
      act(() => window.dispatchEvent(noCode))
      expect(noCode.defaultPrevented).toBe(false)
      expect(execute).toHaveBeenCalledOnce()
    } finally {
      act(stop)
    }
  })
  it('persists capture/clear/reset without using campaign storage and reports failed writes', () => {
    const { result } = renderHook(useInputPreferences)
    const campaign = localStorage.getItem('containment-protocol-game-state')
    act(() => {
      startInputCapture({ id: 'settings.open', device: 'keyboard' })
      captureInput(keyboardBinding('q'))
    })
    expect(JSON.parse(localStorage.getItem(INPUT_PREFERENCES_KEY)!)).toEqual(
      result.current.preferences
    )
    act(() => clearInputBinding('settings.open', 'keyboard'))
    expect(result.current.preferences.overrides['settings.open']).toEqual([
      { device: 'controller', button: 9 },
    ])
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    act(() => saveInputPreferences({ version: 1, overrides: {} }))
    expect(result.current.message).toContain('session only')
    expect(result.current.preferences.overrides).toEqual({})
    expect(localStorage.getItem('containment-protocol-game-state')).toBe(campaign)
  })
  it('keeps capture pending on conflicts and unsupported chords, then restores native activation on cancel', () => {
    const execute = vi.fn()
    renderHook(() =>
      useInputConsumer({ id: 'settings.open', context: 'global', available: () => true, execute })
    )
    const { result } = renderHook(useInputPreferences)
    act(() => {
      startInputCapture({ id: 'settings.open', device: 'keyboard' })
      captureInput(keyboardBinding('ArrowLeft'))
    })
    expect(result.current.message).toContain('Already assigned')
    expect(dispatchInputAction('settings.open')).toBe(false)
    act(() => captureInput(keyboardBinding('Enter')))
    expect(result.current.message).toContain('remain reserved')
    act(() => startInputCapture(null))
    expect(dispatchInputAction('settings.open')).toBe(true)
    expect(execute).toHaveBeenCalledOnce()
  })
  it('does not replay held controller input, fire two commands across a modal boundary, or fire on focus return', () => {
    const previous = Object.getOwnPropertyDescriptor(navigator, 'getGamepads')
    let callback: FrameRequestCallback = () => undefined
    let pressed: number[] = []
    let connected = true
    let focused = true
    const dismiss = vi.fn(() => dialog.removeAttribute('open'))
    const back = vi.fn()
    const dialog = document.createElement('dialog')
    dialog.setAttribute('open', '')
    document.body.append(dialog)
    Object.defineProperty(navigator, 'getGamepads', {
      configurable: true,
      value: () =>
        connected
          ? [
              {
                index: 0,
                mapping: 'standard',
                connected: true,
                buttons: Array.from({ length: 17 }, (_, index) => ({
                  pressed: pressed.includes(index),
                })),
              },
            ]
          : [],
    })
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      callback = cb
      return 1
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
    vi.spyOn(document, 'hasFocus').mockImplementation(() => focused)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    renderHook(() => {
      useInputConsumer({
        id: 'modal.dismiss',
        context: 'modal',
        available: () => dialog.open,
        execute: dismiss,
      })
      useInputConsumer({
        id: 'navigation.back',
        context: 'route',
        available: () => true,
        execute: back,
      })
    })
    const stop = installInputRuntime()
    const tick = () => act(() => callback(0))
    try {
      tick()
      pressed = [1, 4]
      tick()
      expect(dismiss).toHaveBeenCalledOnce()
      expect(back).not.toHaveBeenCalled()
      tick()
      expect(back).not.toHaveBeenCalled()
      pressed = []
      tick()
      focused = false
      window.dispatchEvent(new Event('blur'))
      pressed = [4]
      focused = true
      tick()
      expect(back).not.toHaveBeenCalled()
      pressed = []
      tick()
      pressed = [4]
      tick()
      expect(back).toHaveBeenCalledOnce()
      pressed = []
      tick()
      pressed = [4]
      window.dispatchEvent(new Event('gamepadconnected'))
      tick()
      expect(back).toHaveBeenCalledOnce()
      connected = false
      tick()
      connected = true
      window.dispatchEvent(new Event('gamepadconnected'))
      tick()
      expect(back).toHaveBeenCalledOnce()
    } finally {
      act(stop)
      dialog.remove()
      if (previous) Object.defineProperty(navigator, 'getGamepads', previous)
      else Reflect.deleteProperty(navigator, 'getGamepads')
    }
  })
})
