/**
 * SPE-2163 slice 1: authored stealth tradeoff leave-behind catalog.
 *
 * Pure registry for field-stealth fallout kinds (abandon evidence, burn tool, etc.)
 * with bounded discovery risk and custody-loss references. No weekly hook or UI yet.
 */

import { clamp } from './math'

export type StealthLeaveBehindKind =
  | 'abandon_evidence'
  | 'burn_tool'
  | 'expose_witness'
  | 'leave_trace'
  | 'risk_discovery'

export const STEALTH_LEAVE_BEHIND_KINDS: readonly StealthLeaveBehindKind[] = [
  'abandon_evidence',
  'burn_tool',
  'expose_witness',
  'leave_trace',
  'risk_discovery',
] as const

export interface StealthLeaveBehindDefinition {
  readonly id: string
  readonly kind: StealthLeaveBehindKind
  readonly label: string
  readonly discoveryRisk: number
  readonly custodyLossRefs: readonly string[]
  readonly summary?: string
}

export interface StealthLeaveBehindRegistry {
  readonly entries: readonly StealthLeaveBehindDefinition[]
}

export type StealthLeaveBehindValidationCode =
  | 'missing_id'
  | 'duplicate_id'
  | 'missing_label'
  | 'invalid_kind'
  | 'invalid_discovery_risk'
  | 'empty_custody_loss_ref'
  | 'duplicate_custody_loss_ref'

export interface StealthLeaveBehindValidationIssue {
  readonly code: StealthLeaveBehindValidationCode
  readonly detail: string
  readonly relatedIds?: readonly string[]
}

export interface StealthLeaveBehindValidationResult {
  readonly valid: boolean
  readonly issues: readonly StealthLeaveBehindValidationIssue[]
}

const KIND_SET = new Set<string>(STEALTH_LEAVE_BEHIND_KINDS)

export function isStealthLeaveBehindKind(value: string): value is StealthLeaveBehindKind {
  return KIND_SET.has(value)
}

function normalizeToken(value: string) {
  return value.trim()
}

function pushIssue(
  issues: StealthLeaveBehindValidationIssue[],
  issue: StealthLeaveBehindValidationIssue
) {
  issues.push(issue)
}

export function validateStealthLeaveBehindDefinition(
  definition: StealthLeaveBehindDefinition
): StealthLeaveBehindValidationResult {
  const issues: StealthLeaveBehindValidationIssue[] = []
  const id = normalizeToken(definition.id)
  const label = normalizeToken(definition.label)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      detail: 'Leave-behind definition is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      detail: 'Leave-behind definition is missing label.',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isStealthLeaveBehindKind(definition.kind)) {
    pushIssue(issues, {
      code: 'invalid_kind',
      detail: `Leave-behind ${id || '(unknown)'} has invalid kind ${String(definition.kind)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const discoveryRisk = definition.discoveryRisk
  if (!Number.isFinite(discoveryRisk) || discoveryRisk < 0 || discoveryRisk > 1) {
    pushIssue(issues, {
      code: 'invalid_discovery_risk',
      detail: `Leave-behind ${id || '(unknown)'} discoveryRisk must be a finite number between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const seenCustodyRefs = new Set<string>()
  for (const ref of definition.custodyLossRefs) {
    const normalized = normalizeToken(ref)
    if (!normalized) {
      pushIssue(issues, {
        code: 'empty_custody_loss_ref',
        detail: `Leave-behind ${id || '(unknown)'} declares an empty custodyLossRef.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (seenCustodyRefs.has(normalized)) {
      pushIssue(issues, {
        code: 'duplicate_custody_loss_ref',
        detail: `Leave-behind ${id || '(unknown)'} repeats custodyLossRef ${normalized}.`,
        relatedIds: id ? [id] : undefined,
      })
    } else {
      seenCustodyRefs.add(normalized)
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

export function validateStealthLeaveBehindRegistry(
  registry: StealthLeaveBehindRegistry
): StealthLeaveBehindValidationResult {
  const issues: StealthLeaveBehindValidationIssue[] = []
  const seenIds = new Set<string>()

  for (const entry of registry.entries) {
    const entryResult = validateStealthLeaveBehindDefinition(entry)
    issues.push(...entryResult.issues)

    const id = normalizeToken(entry.id)
    if (!id) {
      continue
    }

    if (seenIds.has(id)) {
      pushIssue(issues, {
        code: 'duplicate_id',
        detail: `Duplicate leave-behind id ${id}.`,
        relatedIds: [id],
      })
    } else {
      seenIds.add(id)
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

export function getStealthLeaveBehindById(
  registry: StealthLeaveBehindRegistry,
  id: string
): StealthLeaveBehindDefinition | undefined {
  const normalized = normalizeToken(id)
  if (!normalized) {
    return undefined
  }

  return registry.entries.find((entry) => entry.id === normalized)
}

function defineLeaveBehind(
  input: StealthLeaveBehindDefinition
): StealthLeaveBehindDefinition {
  return Object.freeze({
    ...input,
    discoveryRisk: clamp(input.discoveryRisk, 0, 1),
    custodyLossRefs: Object.freeze([...input.custodyLossRefs]),
  })
}

/** Baseline catalog: one authored tradeoff row per canonical kind. */
export const DEFAULT_STEALTH_LEAVE_BEHIND_REGISTRY: StealthLeaveBehindRegistry = Object.freeze({
  entries: Object.freeze([
    defineLeaveBehind({
      id: 'leave-behind:abandon-evidence',
      kind: 'abandon_evidence',
      label: 'Abandon compromised evidence',
      summary: 'Drop tainted packets to break the custody chain before exit.',
      discoveryRisk: 0.35,
      custodyLossRefs: ['custody:field-packet', 'custody:chain-seal'],
    }),
    defineLeaveBehind({
      id: 'leave-behind:burn-tool',
      kind: 'burn_tool',
      label: 'Burn field tool',
      summary: 'Destroy a traceable tool rather than carry it through screening.',
      discoveryRisk: 0.25,
      custodyLossRefs: ['custody:tool-serial'],
    }),
    defineLeaveBehind({
      id: 'leave-behind:expose-witness',
      kind: 'expose_witness',
      label: 'Expose cooperating witness',
      summary: 'Redirect scrutiny onto a witness contact to buy extraction time.',
      discoveryRisk: 0.55,
      custodyLossRefs: ['custody:witness-credential'],
    }),
    defineLeaveBehind({
      id: 'leave-behind:leave-trace',
      kind: 'leave_trace',
      label: 'Leave forensic trace',
      summary: 'Accept a discoverable trace to preserve cover on the primary route.',
      discoveryRisk: 0.45,
      custodyLossRefs: ['custody:trace-sample'],
    }),
    defineLeaveBehind({
      id: 'leave-behind:risk-discovery',
      kind: 'risk_discovery',
      label: 'Risk delayed discovery',
      summary: 'Stay in place and accept elevated discovery rather than abandon the objective.',
      discoveryRisk: 0.7,
      custodyLossRefs: ['custody:mission-window'],
    }),
  ]),
})
