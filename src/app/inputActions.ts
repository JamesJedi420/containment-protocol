/** Shared CP input contract. No simulation commands or campaign state belong here. */
export const INPUT_ACTIONS = [
  { id: 'settings.open', label: 'Open settings', context: 'global' },
  { id: 'navigation.back', label: 'Go back', context: 'route' },
  { id: 'navigation.forward', label: 'Go forward', context: 'route' },
  { id: 'modal.dismiss', label: 'Dismiss dialog', context: 'modal' },
  { id: 'reference.open', label: 'Open reference', context: 'global' },
  { id: 'reference.previous', label: 'Previous reference entry', context: 'focused' },
  { id: 'reference.next', label: 'Next reference entry', context: 'focused' },
] as const

export type InputActionId = (typeof INPUT_ACTIONS)[number]['id']
export type InputContext = 'global' | 'route' | 'focused' | 'modal'
export type InputBinding =
  | {
      device: 'keyboard'
      code: string
      alt: boolean
      control: boolean
      shift: boolean
      meta: boolean
    }
  | { device: 'controller'; button: number }
export type BindingOverrides = Partial<Record<InputActionId, InputBinding[]>>
export const MAX_BINDINGS_PER_ACTION = 4
export interface InputPreferences {
  version: 1
  overrides: BindingOverrides
}

export function keyboardBinding(key: string): InputBinding {
  const code = /^[a-z]$/.test(key)
    ? `Key${key.toUpperCase()}`
    : /^\d$/.test(key)
      ? `Digit${key}`
      : key
  return { device: 'keyboard', code, alt: true, control: false, shift: true, meta: false }
}

export const DEFAULT_BINDINGS: Record<InputActionId, readonly InputBinding[]> = {
  'settings.open': [keyboardBinding('s'), { device: 'controller', button: 9 }],
  'navigation.back': [keyboardBinding('ArrowLeft'), { device: 'controller', button: 4 }],
  'navigation.forward': [keyboardBinding('ArrowRight'), { device: 'controller', button: 5 }],
  'modal.dismiss': [keyboardBinding('x'), { device: 'controller', button: 1 }],
  'reference.open': [keyboardBinding('h'), { device: 'controller', button: 8 }],
  'reference.previous': [keyboardBinding('ArrowUp'), { device: 'controller', button: 12 }],
  'reference.next': [keyboardBinding('ArrowDown'), { device: 'controller', button: 13 }],
}

const contexts: Record<InputContext, number> = { global: 0, route: 1, focused: 2, modal: 3 }
export function isInputAction(value: string): value is InputActionId {
  return INPUT_ACTIONS.some((action) => action.id === value)
}

/** Physical US-position profile; native editing, traversal and Escape stay reserved. */
export function isValidBinding(value: unknown): value is InputBinding {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  if (candidate.device === 'controller') {
    return (
      Number.isInteger(candidate.button) &&
      Number(candidate.button) >= 0 &&
      Number(candidate.button) <= 16
    )
  }
  if (candidate.device !== 'keyboard') return false
  if (
    typeof candidate.code !== 'string' ||
    !/^(?:Key[A-Z]|Digit[0-9]|ArrowLeft|ArrowRight|ArrowUp|ArrowDown)$/.test(candidate.code)
  )
    return false
  // Bound the supported keyboard profile to Alt+Shift chords. Avoid browser/OS command keys
  // and AltGraph (Ctrl+Alt), unmodified text, Tab, Enter, Space and native Escape.
  return (
    candidate.alt === true &&
    candidate.shift === true &&
    candidate.control === false &&
    candidate.meta === false
  )
}

export function bindingKey(binding: InputBinding): string {
  return binding.device === 'controller'
    ? `controller:${binding.button}`
    : `keyboard:${Number(binding.alt)}${Number(binding.control)}${Number(binding.shift)}${Number(binding.meta)}:${binding.code}`
}

export function activeBindings(
  preferences: InputPreferences,
  id: InputActionId
): readonly InputBinding[] {
  return preferences.overrides[id] ?? DEFAULT_BINDINGS[id]
}

export function bindingLabel(binding: InputBinding): string {
  return binding.device === 'controller'
    ? `Standard controller button ${binding.button}`
    : `Alt + Shift + ${binding.code.startsWith('Arrow') ? binding.code.replace('Arrow', '') : `${binding.code.replace(/^(Key|Digit)/, '')} (US position)`}`
}

/** Adapter matches TutorialBindingResolver without giving guidance action authority. */
export function resolveInputBindingLabel(
  preferences: InputPreferences,
  actionId: string,
  method: 'keyboard' | 'controller' | 'pointer' | 'touch'
): { label: string } | undefined {
  if (!isInputAction(actionId)) return undefined
  const action = INPUT_ACTIONS.find((entry) => entry.id === actionId)!
  if (method === 'pointer' || method === 'touch') return { label: `${action.label} button` }
  const labels = activeBindings(preferences, actionId)
    .filter((binding) => binding.device === method)
    .map(bindingLabel)
  return labels.length ? { label: labels.join(' or ') } : undefined
}

/** Conflicts are rejected even across contexts so future consumer changes cannot steal a chord. */
export function bindingConflict(
  preferences: InputPreferences,
  id: InputActionId,
  binding: InputBinding
): InputActionId | undefined {
  return INPUT_ACTIONS.find(
    (action) =>
      action.id !== id &&
      activeBindings(preferences, action.id).some(
        (other) => bindingKey(other) === bindingKey(binding)
      )
  )?.id
}

/** Persist overrides only: untouched actions inherit future defaults. Removed IDs are discarded.
 * Future renames require an explicit migration; never infer identity from labels or array order.
 * Unknown versions and malformed/conflicting records fall back to authored defaults.
 */
export function normalizeInputPreferences(raw: unknown): InputPreferences {
  const fallback: InputPreferences = { version: 1, overrides: {} }
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('version' in raw) ||
    raw.version !== 1 ||
    !('overrides' in raw) ||
    !raw.overrides ||
    typeof raw.overrides !== 'object' ||
    Array.isArray(raw.overrides)
  )
    return fallback
  const overrides: BindingOverrides = {}
  for (const action of INPUT_ACTIONS) {
    const value: unknown = Object.prototype.hasOwnProperty.call(raw.overrides, action.id)
      ? Reflect.get(raw.overrides, action.id)
      : undefined
    if (value === undefined) continue
    if (
      !Array.isArray(value) ||
      value.length > MAX_BINDINGS_PER_ACTION ||
      !value.every(isValidBinding) ||
      new Set(value.map(bindingKey)).size !== value.length
    )
      return fallback
    overrides[action.id] = value.map((binding) => ({ ...binding }))
  }
  // Saved assignments predate newly introduced actions. Explicit overrides win over
  // authored defaults; never discard a user's entire profile when defaults expand.
  const explicitKeys = Object.values(overrides).flat().map(bindingKey)
  if (new Set(explicitKeys).size !== explicitKeys.length) return fallback
  const claimed = new Set(explicitKeys)
  for (const action of INPUT_ACTIONS) {
    if (overrides[action.id] !== undefined) continue
    const remaining = DEFAULT_BINDINGS[action.id].filter(
      (binding) => !claimed.has(bindingKey(binding))
    )
    if (remaining.length !== DEFAULT_BINDINGS[action.id].length)
      overrides[action.id] = remaining.map((binding) => ({ ...binding }))
  }
  const result: InputPreferences = { version: 1, overrides }
  if (
    INPUT_ACTIONS.some((action) =>
      activeBindings(result, action.id).some((binding) =>
        bindingConflict(result, action.id, binding)
      )
    )
  )
    return fallback
  return result
}

export interface InputConsumer {
  id: InputActionId
  context: InputContext
  available: () => boolean
  execute: (targetId?: string) => void
}

export function resolveSemanticAction(
  consumers: readonly InputConsumer[],
  modal: boolean
): InputConsumer | undefined {
  return consumers
    .filter((consumer) => (modal ? consumer.context === 'modal' : consumer.context !== 'modal'))
    .sort(
      (left, right) =>
        contexts[right.context] - contexts[left.context] ||
        (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)
    )
    .find((consumer) => consumer.available())
}

/** At most one action fires. A modal is a barrier, including when it has no matching action. */
export function resolveInputAction(
  binding: InputBinding,
  preferences: InputPreferences,
  consumers: readonly InputConsumer[],
  modal: boolean,
  editing: boolean
): InputConsumer | undefined {
  if (!isValidBinding(binding)) return undefined
  return resolveSemanticAction(
    consumers.filter(
      (consumer) =>
        (!editing ||
          (binding.device === 'controller' &&
            modal &&
            consumer.context === 'modal' &&
            ['modal.dismiss', 'reference.previous', 'reference.next'].includes(consumer.id))) &&
        activeBindings(preferences, consumer.id).some(
          (candidate) => bindingKey(candidate) === bindingKey(binding)
        )
    ),
    modal
  )
}
