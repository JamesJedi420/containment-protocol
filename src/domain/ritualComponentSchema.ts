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

function freezeComponent(input: RitualComponent): RitualComponent {
  const component: RitualComponent = {
    id: input.id,
    kind: input.kind,
    label: input.label,
    certainty: input.certainty,
  }
  if (input.frameId !== undefined) {
    return Object.freeze({ ...component, frameId: input.frameId })
  }
  return Object.freeze(component)
}

function issuesResult(
  issues: RitualComponentValidationIssue[]
): RitualComponentValidationResult {
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
  if (frameId !== undefined && (typeof frameId !== 'string' || !FRAME_ID.test(token(frameId)))) {
    issues.push({
      code: 'invalid_frame_id',
      field: `${field}.frameId`,
      ...(id ? { componentId: id } : {}),
    })
    legal = false
  }

  if (!legal || !KIND_SET.has(kind) || !CERTAINTY_SET.has(certainty)) return null

  return freezeComponent({
    id,
    kind: kind as RitualComponentKind,
    label,
    certainty: certainty as RitualComponentCertainty,
    ...(frameId === undefined ? {} : { frameId: token(frameId) }),
  })
}

/**
 * Accept a list of ritual components. Duplicate ids fail closed. Unknown kinds,
 * certainties, or malformed ids are rejected. Input order is not significant.
 * Missing or disputed components remain explicit via certainty.
 */
export function validateRitualComponents(input: unknown): RitualComponentValidationResult {
  if (!Array.isArray(input)) {
    return issuesResult([{ code: 'invalid_registry', field: 'components' }])
  }

  const issues: RitualComponentValidationIssue[] = []
  const seenIds = new Set<string>()

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
  }

  return issuesResult(issues)
}

/** Frozen copy sorted by component id. Returns null when validation fails. */
export function normalizeRitualComponents(
  input: readonly RitualComponent[]
): readonly RitualComponent[] | null {
  const validation = validateRitualComponents(input)
  if (!validation.valid) return null
  const ordered = input
    .map((component, index) => validateComponent(component, index, [])!)
    .sort((a, b) => compareStrings(a.id, b.id))
  return Object.freeze(ordered)
}

export function lookupRitualComponent(
  components: readonly RitualComponent[],
  componentId: string
): RitualComponentLookup {
  const id = token(componentId)
  if (!COMPONENT_ID.test(id)) {
    return Object.freeze({ status: 'invalid_component_id' })
  }
  const matches = components.filter((component) => token(component.id) === id)
  if (matches.length === 0) return Object.freeze({ status: 'unknown_component_id' })
  if (matches.length > 1) return Object.freeze({ status: 'ambiguous_component_id' })
  const component = validateComponent(matches[0], 0, [])
  if (!component) return Object.freeze({ status: 'invalid_component' })
  return Object.freeze({ status: 'found', component })
}

/**
 * Components sharing a frame id, sorted by id. Supports component-by-component
 * variant comparison without assuming necessity or certainty.
 */
export function componentsByFrame(
  components: readonly RitualComponent[],
  frameId: string
): readonly RitualComponent[] {
  const frame = token(frameId)
  if (!FRAME_ID.test(frame)) return Object.freeze([])
  const matches = components.filter((component) => token(component.frameId) === frame)
  const ordered = matches
    .map((component) => validateComponent(component, 0, [])!)
    .sort((a, b) => compareStrings(a.id, b.id))
  return Object.freeze(ordered)
}

/** Authored slice-1 fixtures. Not live rituals and not a second procedure registry. */
export const RITUAL_COMPONENT_FIXTURE_COMPONENTS: readonly RitualComponent[] = Object.freeze([
  Object.freeze({
    id: 'ritual-component:threshold-offering',
    kind: 'material',
    label: 'threshold salt offering',
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
