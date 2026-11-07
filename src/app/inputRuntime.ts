import { useLayoutEffect, useSyncExternalStore } from 'react'
import {
  activeBindings,
  bindingConflict,
  INPUT_ACTIONS,
  MAX_BINDINGS_PER_ACTION,
  isValidBinding,
  normalizeInputPreferences,
  resolveInputAction,
  resolveSemanticAction,
} from './inputActions'
import type { InputActionId, InputBinding, InputConsumer, InputPreferences } from './inputActions'

export const INPUT_PREFERENCES_KEY = 'containment-protocol-input-preferences'
type Capture = { id: InputActionId; device: InputBinding['device'] } | null
interface InputSnapshot {
  preferences: InputPreferences
  capture: Capture
  message: string
}
let snapshot: InputSnapshot | undefined
const listeners = new Set<() => void>()
const consumers = new Map<symbol, InputConsumer>()

function readSnapshot(): InputSnapshot {
  if (!snapshot) {
    let raw: unknown
    let message = ''
    try {
      const saved = window.localStorage.getItem(INPUT_PREFERENCES_KEY)
      if (saved) raw = JSON.parse(saved)
    } catch {
      message = 'Saved controls could not be read. Default controls are available.'
    }
    const preferences = normalizeInputPreferences(raw)
    if (raw !== undefined && JSON.stringify(raw) !== JSON.stringify(preferences)) {
      message =
        'Saved controls were incompatible and have been normalized to supported bindings. Review the controls below.'
    }
    snapshot = { preferences, capture: null, message }
  }
  return snapshot
}

function publish(next: InputSnapshot) {
  snapshot = next
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export function useInputPreferences() {
  return useSyncExternalStore(subscribe, readSnapshot, readSnapshot)
}

export function saveInputPreferences(preferences: InputPreferences) {
  const normalized = normalizeInputPreferences(preferences)
  let message = 'Controls saved on this device.'
  try {
    window.localStorage.setItem(INPUT_PREFERENCES_KEY, JSON.stringify(normalized))
  } catch {
    message = 'Controls changed for this session only. Device storage is unavailable.'
  }
  publish({ preferences: normalized, capture: null, message })
}

export function startInputCapture(capture: Capture) {
  if (!capture && !readSnapshot().capture) return
  publish({
    ...readSnapshot(),
    capture,
    message: capture
      ? 'Press an Alt + Shift shortcut or a standard controller button, as selected. Escape cancels.'
      : 'Capture canceled.',
  })
}

export function captureInput(binding: InputBinding): boolean {
  const current = readSnapshot()
  if (!current.capture) return false
  if (binding.device !== current.capture.device) return true
  if (!isValidBinding(binding)) {
    publish({
      ...current,
      message:
        'Use Alt + Shift with a letter, number or arrow. Native editing and Escape remain reserved.',
    })
    return true
  }
  const conflict = bindingConflict(current.preferences, current.capture.id, binding)
  if (conflict) {
    publish({
      ...current,
      message: `Already assigned to ${INPUT_ACTIONS.find((action) => action.id === conflict)!.label}. Clear or change that binding first.`,
    })
    return true
  }
  const previous = activeBindings(current.preferences, current.capture.id)
  const retained = previous.filter((item) => item.device !== binding.device)
  if (retained.length >= MAX_BINDINGS_PER_ACTION) {
    publish({
      ...current,
      message:
        'Clear the other device’s bindings before adding this one. No controls were changed.',
    })
    return true
  }
  saveInputPreferences({
    version: 1,
    overrides: {
      ...current.preferences.overrides,
      [current.capture.id]: [...retained, binding],
    },
  })
  return true
}

export function clearInputBinding(id: InputActionId, device: InputBinding['device']) {
  const { preferences } = readSnapshot()
  saveInputPreferences({
    version: 1,
    overrides: {
      ...preferences.overrides,
      [id]: activeBindings(preferences, id).filter((binding) => binding.device !== device),
    },
  })
}

export function useInputConsumer(consumer: InputConsumer) {
  useLayoutEffect(() => {
    const token = Symbol(consumer.id)
    consumers.set(token, consumer)
    return () => {
      consumers.delete(token)
    }
  }, [consumer])
}

export function dispatchInputAction(id: InputActionId): boolean {
  if (readSnapshot().capture) return false
  const modal = document.querySelector('dialog[open]') !== null
  const consumer = resolveSemanticAction(
    [...consumers.values()].filter((item) => item.id === id),
    modal
  )
  if (!consumer) return false
  consumer.execute()
  return true
}

function editingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.closest('input, textarea, select, [role="textbox"]') !== null)
  )
}

export function keyboardInput(event: KeyboardEvent): InputBinding {
  return {
    device: 'keyboard',
    code: event.code,
    alt: event.altKey,
    control: event.ctrlKey,
    shift: event.shiftKey,
    meta: event.metaKey,
  }
}

/** Shell lifetime only. Standard gamepad profile; no identification/fingerprinting or axes. */
export function installInputRuntime(): () => void {
  let frame = 0
  let stopped = false
  let held = new Set<string>()
  let knownPads = new Set<number>()
  let wasFocused = false
  function activate(binding: InputBinding, editing: boolean): boolean {
    if (captureInput(binding)) return true
    const consumer = resolveInputAction(
      binding,
      readSnapshot().preferences,
      [...consumers.values()],
      document.querySelector('dialog[open]') !== null,
      editing
    )
    if (!consumer) return false
    consumer.execute()
    return true
  }
  function keydown(event: KeyboardEvent) {
    if (
      event.defaultPrevented ||
      event.repeat ||
      event.isComposing ||
      event.keyCode === 229 ||
      event.getModifierState('AltGraph')
    )
      return
    if (readSnapshot().capture && event.key === 'Escape') {
      event.preventDefault()
      startInputCapture(null)
      return
    }
    // Capture does not consume Tab/Enter/Space, so native editor controls remain operable.
    if (['Tab', 'Enter', ' ', 'Escape', 'Alt', 'Shift', 'Control', 'Meta'].includes(event.key))
      return
    const binding = keyboardInput(event)
    const capture = readSnapshot().capture
    if (capture?.device === 'controller') return
    if (!isValidBinding(binding)) {
      if (capture) captureInput(binding)
      return // Never swallow native editing or browser commands during capture.
    }
    if (activate(binding, editingTarget(event.target))) event.preventDefault()
  }
  function poll() {
    if (stopped) return
    let pads: (Gamepad | null)[] = []
    try {
      pads = [...(navigator.getGamepads?.() ?? [])]
    } catch {
      /* Permissions policy: native controls remain available. */
    }
    const next = new Set<string>()
    const connected = new Set<number>()
    const focused = document.visibilityState === 'visible' && document.hasFocus()
    const pressed: InputBinding[] = []
    const supported = pads
      .filter((pad): pad is Gamepad => !!pad?.connected && pad.mapping === 'standard')
      .slice(0, 4)
    for (const pad of supported) {
      connected.add(pad.index)
      for (let button = 0; button < Math.min(pad.buttons.length, 17); button += 1) {
        if (!pad.buttons[button].pressed) continue
        const key = `${pad.index}:${button}`
        next.add(key)
        if (focused && wasFocused && knownPads.has(pad.index) && !held.has(key))
          pressed.push({ device: 'controller', button })
      }
    }
    held = next
    knownPads = connected
    wasFocused = focused
    // Consume a simultaneous edge batch once, before a dismissal can expose background commands.
    for (const binding of pressed) {
      if (activate(binding, editingTarget(document.activeElement))) break
    }
    frame = pads.some((pad) => pad?.connected) ? window.requestAnimationFrame(poll) : 0
  }
  function wake(event: GamepadEvent) {
    // A reconnect may reuse an index before a frame observes the disconnection.
    knownPads.delete(event.gamepad.index)
    if (!frame && !stopped) frame = window.requestAnimationFrame(poll)
  }
  function suspend() {
    // Background tabs can suspend animation frames entirely; invalidate synchronously.
    wasFocused = false
  }
  window.addEventListener('keydown', keydown)
  window.addEventListener('gamepadconnected', wake)
  window.addEventListener('blur', suspend)
  document.addEventListener('visibilitychange', suspend)
  frame = window.requestAnimationFrame(poll)
  return () => {
    stopped = true
    window.removeEventListener('keydown', keydown)
    window.removeEventListener('gamepadconnected', wake)
    window.removeEventListener('blur', suspend)
    document.removeEventListener('visibilitychange', suspend)
    window.cancelAnimationFrame(frame)
    startInputCapture(null)
  }
}
