/**
 * SPE-714 slice 1: deterministic activation prerequisite schema and evaluation.
 *
 * Bounded checks for body state, role, environment, paired hardware, or formation
 * before item action use. Not a full compatibility simulator, charge economy,
 * or GameState persistence. Action-level evaluation; cooldown/cadence remains
 * with the owning action contract.
 */

export const ACTIVATION_PREREQUISITE_KINDS = [
  'free_hands',
  'exposed_skin',
  'role_compatible',
  'environment_ready',
  'formation_maintained',
  'paired_contact',
] as const
export type ActivationPrerequisiteKind = (typeof ACTIVATION_PREREQUISITE_KINDS)[number]

export interface ActivationPrerequisite {
  readonly id: string
  readonly itemRef: string
  readonly actionRef: string
  readonly kind: ActivationPrerequisiteKind
  readonly requiredValue?: string
}

export interface ActivationContext {
  readonly freeHands: boolean
  readonly exposedSkin: boolean
  readonly role: string
  readonly environment: string
  readonly formationMaintained: boolean
  readonly pairedContact: boolean
}

export interface ActivationEligibility {
  readonly eligible: boolean
  readonly reasons: readonly string[]
}

export interface ActivationPrerequisiteValidationIssue {
  readonly code: string
  readonly field: string
  readonly prerequisiteId?: string
}

export interface ActivationPrerequisiteValidationResult {
  readonly valid: boolean
  readonly issues: readonly ActivationPrerequisiteValidationIssue[]
}

const KIND_SET: ReadonlySet<string> = new Set(ACTIVATION_PREREQUISITE_KINDS)
const PREREQ_ID = /^activation-prereq:[a-z0-9]+(?:-[a-z0-9]+)*$/
const REF = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

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

function freezePrerequisite(input: ActivationPrerequisite): ActivationPrerequisite {
  const base: ActivationPrerequisite = {
    id: input.id,
    itemRef: input.itemRef,
    actionRef: input.actionRef,
    kind: input.kind,
  }
  if (input.requiredValue !== undefined) {
    return Object.freeze({ ...base, requiredValue: input.requiredValue })
  }
  return Object.freeze(base)
}

function issuesResult(
  issues: ActivationPrerequisiteValidationIssue[]
): ActivationPrerequisiteValidationResult {
  const ordered = issues
    .slice()
    .sort(
      (a, b) =>
        compareStrings(a.code, b.code) ||
        compareStrings(a.field, b.field) ||
        compareStrings(a.prerequisiteId ?? '', b.prerequisiteId ?? '')
    )
  return Object.freeze({
    valid: ordered.length === 0,
    issues: Object.freeze(ordered.map((issue) => Object.freeze({ ...issue }))),
  })
}

function validateOne(
  input: unknown,
  index: number,
  issues: ActivationPrerequisiteValidationIssue[]
): ActivationPrerequisite | null {
  const field = `prerequisites[${index}]`
  if (!isPlainRecord(input)) {
    issues.push({ code: 'invalid_prerequisite', field })
    return null
  }

  const id = token(input.id)
  const itemRef = token(input.itemRef)
  const actionRef = token(input.actionRef)
  const kind = token(input.kind)
  let legal = true

  if (!PREREQ_ID.test(id)) {
    issues.push({
      code: 'invalid_prerequisite_id',
      field: `${field}.id`,
      ...(id ? { prerequisiteId: id } : {}),
    })
    legal = false
  }
  if (!REF.test(itemRef)) {
    issues.push({
      code: 'invalid_item_ref',
      field: `${field}.itemRef`,
      ...(id ? { prerequisiteId: id } : {}),
    })
    legal = false
  }
  if (!REF.test(actionRef)) {
    issues.push({
      code: 'invalid_action_ref',
      field: `${field}.actionRef`,
      ...(id ? { prerequisiteId: id } : {}),
    })
    legal = false
  }
  if (!KIND_SET.has(kind)) {
    issues.push({
      code: 'unknown_kind',
      field: `${field}.kind`,
      ...(id ? { prerequisiteId: id } : {}),
    })
    legal = false
  }

  if (!legal) return null

  const requiredValue = input.requiredValue
  const prereq: ActivationPrerequisite = {
    id,
    itemRef,
    actionRef,
    kind: kind as ActivationPrerequisiteKind,
    ...(typeof requiredValue === 'string' ? { requiredValue: token(requiredValue) } : {}),
  }
  return freezePrerequisite(prereq)
}

export function validateActivationPrerequisites(
  input: unknown
): ActivationPrerequisiteValidationResult {
  if (!Array.isArray(input)) {
    return issuesResult([{ code: 'invalid_registry', field: 'prerequisites' }])
  }

  const issues: ActivationPrerequisiteValidationIssue[] = []
  const seenIds = new Set<string>()

  for (let index = 0; index < input.length; index += 1) {
    const prereq = validateOne(input[index], index, issues)
    if (!prereq) continue
    if (seenIds.has(prereq.id)) {
      issues.push({
        code: 'duplicate_prerequisite_id',
        field: `prerequisites[${index}].id`,
        prerequisiteId: prereq.id,
      })
    }
    seenIds.add(prereq.id)
  }

  return issuesResult(issues)
}

function checkKind(prereq: ActivationPrerequisite, context: ActivationContext): string | null {
  switch (prereq.kind) {
    case 'free_hands':
      return context.freeHands ? null : 'missing_free_hands'
    case 'exposed_skin':
      return context.exposedSkin ? null : 'missing_exposed_skin'
    case 'role_compatible':
      return context.role === (prereq.requiredValue ?? '') ? null : 'role_incompatible'
    case 'environment_ready':
      return context.environment === (prereq.requiredValue ?? '') ? null : 'environment_not_ready'
    case 'formation_maintained':
      return context.formationMaintained ? null : 'formation_not_maintained'
    case 'paired_contact':
      return context.pairedContact ? null : 'missing_paired_contact'
    default:
      return 'unknown_kind'
  }
}

/**
 * Evaluate action-level eligibility for an item. Returns inspectable reasons
 * when any prerequisite fails. Sibling actions are independent unless they
 * share an explicit prerequisite.
 */
export function evaluateActivationEligibility(
  prerequisites: readonly ActivationPrerequisite[],
  itemRef: string,
  actionRef: string,
  context: ActivationContext
): ActivationEligibility {
  const relevant = prerequisites.filter(
    (p) => token(p.itemRef) === token(itemRef) && token(p.actionRef) === token(actionRef)
  )
  const reasons: string[] = []
  for (const prereq of relevant) {
    const failure = checkKind(prereq, context)
    if (failure) reasons.push(failure)
  }
  reasons.sort(compareStrings)
  return Object.freeze({
    eligible: reasons.length === 0,
    reasons: Object.freeze(reasons),
  })
}

/** Authored slice-1 fixtures. Not live inventory. */
export const ACTIVATION_PREREQUISITE_FIXTURES: readonly ActivationPrerequisite[] = Object.freeze([
  Object.freeze({
    id: 'activation-prereq:medkit-stabilize-free-hands',
    itemRef: 'item:medkit',
    actionRef: 'action:stabilize',
    kind: 'free_hands',
  }),
  Object.freeze({
    id: 'activation-prereq:medkit-stabilize-role',
    itemRef: 'item:medkit',
    actionRef: 'action:stabilize',
    kind: 'role_compatible',
    requiredValue: 'medic',
  }),
  Object.freeze({
    id: 'activation-prereq:scanner-scan-environment',
    itemRef: 'item:scanner',
    actionRef: 'action:scan',
    kind: 'environment_ready',
    requiredValue: 'clear-line-of-sight',
  }),
])
