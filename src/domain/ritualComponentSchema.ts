/**
 * SPE-1332 slice 1: deterministic ritual component data schema.
 *
 * Structured component sets for authored ritual procedures. This is not a live
 * ritual executor, GameState field, activation engine, or countermeasure system.
 * Unknown, disputed, and variant components remain explicit. Certainty and
 * necessity stay with their owning rules.
 */

export const RITUAL_COMPONENT_KINDS = [
  'actor',
  'object',
  'material',
  'body_state',
  'wording',
  'count',
  'placement',
  'route',
  'time',
  'recipient',
  'failure_state',
] as const
export type RitualComponentKind = (typeof RITUAL_COMPONENT_KINDS)[number]

export const RITUAL_COMPONENT_CERTAINTIES = ['known', 'disputed', 'unknown'] as const
export type RitualComponentCertainty = (typeof RITUAL_COMPONENT_CERTAINTIES)[number]

export interface RitualComponent {
  readonly id: string
  readonly kind: RitualComponentKind
  readonly label: string
  readonly certainty: RitualComponentCertainty
  /** Optional shared frame id for variant comparison. */
  readonly frameId?: string
  /** Variant and slot ids are paired and require a frame. */
  readonly variantId?: string
  /** Stable identity of the corresponding step across variants of the frame. */
  readonly slotId?: string
}

export interface RitualVariantComparisonRow {
  readonly slotId: string
  readonly left: RitualComponent | null
  readonly right: RitualComponent | null
}

export interface RitualComponentValidationIssue {
  readonly code: string
  readonly field: string
  readonly componentId?: string
}

export interface RitualComponentValidationResult {
  readonly valid: boolean
  readonly issues: readonly RitualComponentValidationIssue[]
}

export type RitualComponentLookup =
  | { readonly status: 'found'; readonly component: RitualComponent }
  | { readonly status: 'unknown_component_id' }
  | { readonly status: 'ambiguous_component_id' }
  | { readonly status: 'invalid_component_id' }
  | { readonly status: 'invalid_component' }

const KIND_SET: ReadonlySet<string> = new Set(RITUAL_COMPONENT_KINDS)
const CERTAINTY_SET: ReadonlySet<string> = new Set(RITUAL_COMPONENT_CERTAINTIES)
const COMPONENT_ID = /^ritual-component:[a-z0-9]+(?:-[a-z0-9]+)*$/
const FRAME_ID = /^ritual-frame:[a-z0-9]+(?:-[a-z0-9]+)*$/
const VARIANT_ID = /^ritual-variant:[a-z0-9]+(?:-[a-z0-9]+)*$/
const SLOT_ID = /^ritual-slot:[a-z0-9]+(?:-[a-z0-9]+)*$/

function compareStrings(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function token(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function issuesResult(issues: RitualComponentValidationIssue[]): RitualComponentValidationResult {
  const ordered = issues
    .slice()
    .sort(
      (a, b) =>
        compareStrings(a.code, b.code) ||
        compareStrings(a.field, b.field) ||
        compareStrings(a.componentId ?? '', b.componentId ?? '')
    )
  return Object.freeze({
    valid: ordered.length === 0,
    issues: Object.freeze(ordered.map((issue) => Object.freeze({ ...issue }))),
  })
}

function validateComponent(
  input: unknown,
  index: number,
  issues: RitualComponentValidationIssue[]
): RitualComponent | null {
  const field = `components[${index}]`
  if (!isPlainRecord(input)) {
    issues.push({ code: 'invalid_component', field })
    return null
  }

  const id = token(input.id)
  const kind = token(input.kind)
  const label = token(input.label)
  const certainty = token(input.certainty)
  let legal = true

  if (!COMPONENT_ID.test(id)) {
    issues.push({
      code: 'invalid_component_id',
      field: `${field}.id`,
      ...(id ? { componentId: id } : {}),
    })
    legal = false
  }
  if (!KIND_SET.has(kind)) {
    issues.push({
      code: 'unknown_kind',
      field: `${field}.kind`,
      ...(id ? { componentId: id } : {}),
    })
    legal = false
  }
  if (!label || label.length > 120) {
    issues.push({
      code: 'invalid_label',
      field: `${field}.label`,
      ...(id ? { componentId: id } : {}),
    })
    legal = false
  }
  if (!CERTAINTY_SET.has(certainty)) {
    issues.push({
      code: 'unknown_certainty',
      field: `${field}.certainty`,
      ...(id ? { componentId: id } : {}),
    })
    legal = false
  }

  const frameId = input.frameId
  const hasComparisonMetadata = input.variantId !== undefined || input.slotId !== undefined
  if ((frameId !== undefined || hasComparisonMetadata) && !FRAME_ID.test(token(frameId))) {
    issues.push({
      code: 'invalid_frame_id',
      field: `${field}.frameId`,
      ...(id ? { componentId: id } : {}),
    })
    legal = false
  }

  const variantId = token(input.variantId)
  const slotId = token(input.slotId)
  if (hasComparisonMetadata && !VARIANT_ID.test(variantId)) {
    issues.push({ code: 'invalid_variant_id', field: `${field}.variantId`, componentId: id })
    legal = false
  }
  if (hasComparisonMetadata && !SLOT_ID.test(slotId)) {
    issues.push({ code: 'invalid_slot_id', field: `${field}.slotId`, componentId: id })
    legal = false
  }

  if (!legal) return null

  return Object.freeze({
    id,
    kind: kind as RitualComponentKind,
    label,
    certainty: certainty as RitualComponentCertainty,
    ...(frameId === undefined ? {} : { frameId: token(frameId) }),
    ...(hasComparisonMetadata ? { variantId, slotId } : {}),
  })
}

function parseComponents(input: readonly unknown[]) {
  const components: RitualComponent[] = []
  const issues: RitualComponentValidationIssue[] = []
  const seenIds = new Set<string>()
  const slots = new Map<string, { kind: RitualComponentKind; variants: Set<string> }>()

  for (let index = 0; index < input.length; index += 1) {
    const component = validateComponent(input[index], index, issues)
    if (!component) continue
    if (seenIds.has(component.id)) {
      issues.push({
        code: 'duplicate_component_id',
        field: `components[${index}].id`,
        componentId: component.id,
      })
    }
    seenIds.add(component.id)

    const { frameId, variantId, slotId } = component
    if (frameId && variantId && slotId) {
      const slotKey = `${frameId}/${slotId}`
      const slot = slots.get(slotKey)
      if (!slot) {
        slots.set(slotKey, { kind: component.kind, variants: new Set([variantId]) })
      } else {
        const field = `components[${index}].slotId`
        if (slot.variants.has(variantId)) {
          issues.push({ code: 'duplicate_variant_slot', field, componentId: component.id })
        }
        if (slot.kind !== component.kind) {
          issues.push({ code: 'mismatched_slot_kind', field, componentId: component.id })
        }
        slot.variants.add(variantId)
      }
    }
    components.push(component)
  }

  return { components, issues }
}

/**
 * Validate a component set. Each variant may claim a slot once, and corresponding
 * slots in the same frame share a kind. Certainty describes the authored claim.
 */
export function validateRitualComponents(input: unknown): RitualComponentValidationResult {
  if (!Array.isArray(input)) {
    return issuesResult([{ code: 'invalid_registry', field: 'components' }])
  }
  return issuesResult(parseComponents(input).issues)
}

/** Frozen copy sorted by component id. Returns null when validation fails. */
export function normalizeRitualComponents(
  input: readonly RitualComponent[]
): readonly RitualComponent[] | null {
  if (!Array.isArray(input)) return null
  const { components, issues } = parseComponents(input)
  if (issues.length > 0) return null
  return Object.freeze(components.sort((a, b) => compareStrings(a.id, b.id)))
}

export function lookupRitualComponent(
  components: readonly RitualComponent[],
  componentId: string
): RitualComponentLookup {
  const id = token(componentId)
  if (!COMPONENT_ID.test(id)) {
    return Object.freeze({ status: 'invalid_component_id' })
  }
  const matches = components.filter((component) => token(component?.id) === id)
  if (matches.length === 0) return Object.freeze({ status: 'unknown_component_id' })
  if (matches.length > 1) return Object.freeze({ status: 'ambiguous_component_id' })
  const component = validateComponent(matches[0], 0, [])
  if (!component) return Object.freeze({ status: 'invalid_component' })
  return Object.freeze({ status: 'found', component })
}

/**
 * Valid components sharing a frame id, sorted by id. Use registry validation to
 * diagnose malformed records and duplicate identities.
 */
export function componentsByFrame(
  components: readonly RitualComponent[],
  frameId: string
): readonly RitualComponent[] {
  const frame = token(frameId)
  if (!FRAME_ID.test(frame)) return Object.freeze([])
  const matches: RitualComponent[] = []
  for (const input of components) {
    if (token(input?.frameId) !== frame) continue
    const component = validateComponent(input, 0, [])
    if (component) matches.push(component)
  }
  return Object.freeze(matches.sort((a, b) => compareStrings(a.id, b.id)))
}

/**
 * Align two variants by slot within a shared frame. A null side is an absent
 * counterpart, distinct from a component explicitly authored as unknown or disputed.
 * Returns null for invalid data or when either variant is absent from the frame.
 */
export function compareRitualVariants(
  components: readonly RitualComponent[],
  frameId: string,
  leftVariantId: string,
  rightVariantId: string
): readonly RitualVariantComparisonRow[] | null {
  const frame = token(frameId)
  const leftId = token(leftVariantId)
  const rightId = token(rightVariantId)
  if (!FRAME_ID.test(frame) || !VARIANT_ID.test(leftId) || !VARIANT_ID.test(rightId)) return null
  if (leftId === rightId) return null

  const normalized = normalizeRitualComponents(components)
  if (!normalized) return null

  const left = new Map<string, RitualComponent>()
  const right = new Map<string, RitualComponent>()
  for (const component of normalized) {
    if (component.frameId !== frame || !component.slotId) continue
    if (component.variantId === leftId) left.set(component.slotId, component)
    if (component.variantId === rightId) right.set(component.slotId, component)
  }
  if (left.size === 0 || right.size === 0) return null

  const slots = [...new Set([...left.keys(), ...right.keys()])].sort(compareStrings)
  return Object.freeze(
    slots.map((slotId) =>
      Object.freeze({ slotId, left: left.get(slotId) ?? null, right: right.get(slotId) ?? null })
    )
  )
}

/** Authored slice-1 fixtures. Not live rituals and not a second procedure registry. */
export const RITUAL_COMPONENT_FIXTURE_COMPONENTS: readonly RitualComponent[] = Object.freeze([
  Object.freeze({
    id: 'ritual-component:threshold-offering',
    kind: 'material',
    label: 'threshold starglass offering',
    certainty: 'known',
    frameId: 'ritual-frame:ward-binding',
  }),
  Object.freeze({
    id: 'ritual-component:spoken-binding',
    kind: 'wording',
    label: 'spoken binding formula',
    certainty: 'disputed',
    frameId: 'ritual-frame:ward-binding',
  }),
  Object.freeze({
    id: 'ritual-component:unknown-count',
    kind: 'count',
    label: 'repetition count',
    certainty: 'unknown',
  }),
])
