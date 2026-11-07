import { describe, expect, it, vi } from 'vitest'
import {
  activeBindings,
  bindingConflict,
  bindingKey,
  DEFAULT_BINDINGS,
  INPUT_ACTIONS,
  isValidBinding,
  keyboardBinding,
  normalizeInputPreferences,
  resolveInputAction,
  resolveInputBindingLabel,
} from './inputActions'
import type { InputConsumer } from './inputActions'

const defaults = normalizeInputPreferences(undefined)
describe('canonical input contract', () => {
  it('has unique stable IDs and valid nonconflicting defaults for both device profiles', () => {
    expect(new Set(INPUT_ACTIONS.map((action) => action.id)).size).toBe(INPUT_ACTIONS.length)
    for (const action of INPUT_ACTIONS) {
      expect(DEFAULT_BINDINGS[action.id].map((binding) => binding.device)).toEqual([
        'keyboard',
        'controller',
      ])
      for (const binding of DEFAULT_BINDINGS[action.id]) {
        expect(isValidBinding(binding)).toBe(true)
        expect(bindingConflict(defaults, action.id, binding)).toBeUndefined()
      }
    }
  })
  it('keeps native traversal, editing, Escape, AltGraph and browser-command keys reserved', () => {
    for (const key of ['Escape', 'Enter', 'Tab', ' ', 'F4', 'é'])
      expect(isValidBinding(keyboardBinding(key))).toBe(false)
    expect(isValidBinding({ ...keyboardBinding('s'), control: true })).toBe(false)
    expect(isValidBinding({ device: 'controller', button: 17 })).toBe(false)
    expect(isValidBinding({ device: 'controller', button: 0.5 })).toBe(false)
    expect(isValidBinding({ device: 'keyboard', key: 's' })).toBe(false)
  })
  it('migrates removed actions, inherits changed defaults and preserves explicit clearing', () => {
    const migrated = normalizeInputPreferences({
      version: 1,
      overrides: { removed: [keyboardBinding('q')], 'navigation.back': [] },
    })
    expect(migrated.overrides).toEqual({ 'navigation.back': [] })
    expect(activeBindings(migrated, 'settings.open')).toEqual(DEFAULT_BINDINGS['settings.open'])
    expect(activeBindings(migrated, 'navigation.back')).toEqual([])
    expect(
      normalizeInputPreferences({
        version: 99,
        overrides: { 'settings.open': [keyboardBinding('q')] },
      })
    ).toEqual(defaults)
  })
  it('fails malformed, duplicate, conflicting and excessive saved mappings to safe defaults', () => {
    for (const overrides of [
      { 'settings.open': 'bad' },
      { 'settings.open': [keyboardBinding('Escape')] },
      { 'settings.open': [keyboardBinding('q'), keyboardBinding('q')] },
      { 'settings.open': [keyboardBinding('q')], 'navigation.back': [keyboardBinding('q')] },
      { 'settings.open': Array.from({ length: 5 }, (_, index) => keyboardBinding(String(index))) },
    ])
      expect(normalizeInputPreferences({ version: 1, overrides })).toEqual(defaults)
  })
  it('preserves saved controller overrides when new filter defaults overlap', () => {
    const saved = normalizeInputPreferences({
      version: 1,
      overrides: { 'navigation.back': [{ device: 'controller', button: 0 }] },
    })
    expect(activeBindings(saved, 'navigation.back')).toEqual([{ device: 'controller', button: 0 }])
    expect(activeBindings(saved, 'filters.activate')).toEqual([keyboardBinding('l')])
    expect(normalizeInputPreferences(saved)).toEqual(saved)
  })
  it('preserves multiple valid bindings and gives downstream consumers current labels', () => {
    const preferences = normalizeInputPreferences({
      version: 1,
      overrides: {
        'settings.open': [
          keyboardBinding('q'),
          keyboardBinding('w'),
          { device: 'controller', button: 8 },
        ],
      },
    })
    expect(resolveInputBindingLabel(preferences, 'settings.open', 'keyboard')?.label).toBe(
      'Alt + Shift + Q (US position) or Alt + Shift + W (US position)'
    )
    expect(resolveInputBindingLabel(preferences, 'settings.open', 'controller')?.label).toContain(
      '8'
    )
    expect(resolveInputBindingLabel(preferences, 'settings.open', 'touch')?.label).toBe(
      'Open settings button'
    )
    expect(resolveInputBindingLabel(preferences, 'removed', 'keyboard')).toBeUndefined()
    expect(bindingKey(keyboardBinding('s'))).not.toBe(bindingKey(keyboardBinding('q')))
  })
  it('resolves one highest-priority available consumer and blocks background commands in modals and text input', () => {
    const execute = vi.fn()
    const global: InputConsumer = {
      id: 'settings.open',
      context: 'global',
      available: () => true,
      execute,
    }
    const route: InputConsumer = { ...global, context: 'route' }
    const focused: InputConsumer = { ...global, context: 'focused' }
    const modal: InputConsumer = {
      id: 'modal.dismiss',
      context: 'modal',
      available: () => true,
      execute,
    }
    expect(
      resolveInputAction(keyboardBinding('s'), defaults, [global, focused, route], false, false)
    ).toBe(focused)
    expect(
      resolveInputAction(
        keyboardBinding('s'),
        defaults,
        [global, route, { ...focused, available: () => false }],
        false,
        false
      )
    ).toBe(route)
    expect(
      resolveInputAction(keyboardBinding('s'), defaults, [global, modal], true, false)
    ).toBeUndefined()
    expect(
      resolveInputAction(keyboardBinding('s'), defaults, [global], false, true)
    ).toBeUndefined()
    expect(resolveInputAction(keyboardBinding('x'), defaults, [global, modal], true, false)).toBe(
      modal
    )
    expect(
      resolveInputAction(
        { device: 'controller', button: 1 },
        defaults,
        [global, modal],
        true,
        false
      )
    ).toBe(modal)
    expect(execute).not.toHaveBeenCalled()
  })
})
