/**
 * SPE-1135 — bounded duty and obligation registry (pure domain).
 *
 * Role obligations support act/omission evaluation, period-bound qualification
 * (SPE-1071 integer weeks only), and downstream consumption of SPE-3181 requirement
 * outcome projections. Terminal decision provenance follows the SPE-2805 input shape;
 * this module does not implement expiring-decision lifecycle resolution.
 *
 * No GameState field, universal moral-code sandbox, or contractual conflict engine.
 */

import type { DutyConsumptionProjection } from './containmentRequirementFulfillment'

export const DUTY_OBLIGATION_REGISTRY_OWNER = 'SPE-1135' as const
export const DUTY_OBLIGATION_REGISTRY_SCHEMA_VERSION = 'spe-1135.v1' as const
export const DUTY_OBLIGATION_REGISTRY_MAX_RECORDS = 256 as const

export const DUTY_ROLE_IDS = [
  'field_lead',
  'medic',
  'analyst',
  'archivist',
  'handler',
  'commander',
  'contractor',
  'witness_protection_officer',
  'automated_system',
  'artificial_agent',
] as const
export type DutyRoleId = (typeof DUTY_ROLE_IDS)[number]

export const DUTY_KINDS = [
  'warning',
  'inspection',
  'escalation',
  'isolation',
  'record_upkeep',
  'evidence_preservation',
  'care',
] as const
export type DutyKind = (typeof DUTY_KINDS)[number]

export const OBLIGATION_MODES = ['act_required', 'omission_watch'] as const
export type ObligationMode = (typeof OBLIGATION_MODES)[number]

/** SPE-1071 authoritative campaign-week period; no private clock. */
export interface AuthoritativePeriodWindow {
  readonly startWeek: number
  readonly endWeek: number
}

/**
 * SPE-2805-shaped terminal provenance (consumer ref only — lifecycle owner is SPE-2805).
 */
export const TERMINAL_DECISION_PROVENANCE_KINDS = [
  'actionable',
  'expired',
  'explicit_refusal',
  'superseded',
  'canceled',
] as const
export type TerminalDecisionProvenanceKind = (typeof TERMINAL_DECISION_PROVENANCE_KINDS)[number]

export interface Spe2805TerminalDecisionProvenance {
  readonly decisionRef: string
  readonly kind: TerminalDecisionProvenanceKind
  readonly terminalReason?: string
}

export interface DutyObligationRecord {
  readonly id: string
  readonly roleId: DutyRoleId
  readonly dutyKind: DutyKind
  readonly mode: ObligationMode
  readonly subjectScope?: string
  readonly requirementBinding?: string
  readonly periodWindow?: AuthoritativePeriodWindow
  readonly qualifyingActionRef?: string
}

export interface DutyObligationRegistry {
  readonly schemaVersion: typeof DUTY_OBLIGATION_REGISTRY_SCHEMA_VERSION
  readonly obligations: Readonly<Record<string, DutyObligationRecord>>
  readonly roleIndex: Readonly<Record<string, readonly string[]>>
}

export type OmissionEvaluationResult =
  | 'actionable_omission'
  | 'no_omission_terminal_window'
  | 'explicit_refusal_recorded'
  | 'act_observed_compliant'
  | 'not_applicable'

export interface OmissionEvaluation {
  readonly obligationId: string
  readonly result: OmissionEvaluationResult
  readonly reasonCodes: readonly string[]
}

export type PeriodComplianceResult =
  | 'period_satisfied'
  | 'period_noncompliant'
  | 'period_pending'
  | 'period_terminal_no_breach'
  | 'not_period_bound'

export interface PeriodComplianceEvaluation {
  readonly obligationId: string
  readonly periodKey: string
  readonly result: PeriodComplianceResult
  readonly auditablePriorPeriodOutcome?: PeriodComplianceResult
  readonly reasonCodes: readonly string[]
}

export type DutyCompliance =
  | 'compliant'
  | 'breach'
  | 'pending'
  | 'refused'
  | 'not_applicable'
  | 'terminal_no_breach'

export interface DutyRequirementEvaluation {
  readonly obligationId: string
  readonly roleId: DutyRoleId
  readonly compliance: DutyCompliance
  readonly requirementRemainsAuthority: true
  readonly fulfillmentOutcome: DutyConsumptionProjection['fulfillmentOutcome']
  readonly reasonCodes: readonly string[]
}

export interface DutyEvaluationContext {
  readonly campaignWeek?: number
  readonly provenance?: Spe2805TerminalDecisionProvenance
  readonly qualifyingActionWeek?: number
  readonly actObserved?: boolean
}

const FORBIDDEN_IDS = new Set(['__proto__', 'constructor', 'prototype', 'toString', 'valueOf'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isSafeId(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false
  const id = value.trim()
  if (FORBIDDEN_IDS.has(id)) return false
  if (id.includes('\0')) return false
  return true
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isDutyRoleId(value: unknown): value is DutyRoleId {
  return typeof value === 'string' && (DUTY_ROLE_IDS as readonly string[]).includes(value)
}

function isDutyKind(value: unknown): value is DutyKind {
  return typeof value === 'string' && (DUTY_KINDS as readonly string[]).includes(value)
}

function isObligationMode(value: unknown): value is ObligationMode {
  return typeof value === 'string' && (OBLIGATION_MODES as readonly string[]).includes(value)
}

function isTerminalKind(value: unknown): value is TerminalDecisionProvenanceKind {
  return (
    typeof value === 'string' &&
    (TERMINAL_DECISION_PROVENANCE_KINDS as readonly string[]).includes(value)
  )
}

function createObligationsBag(): Record<string, DutyObligationRecord> {
  return Object.create(null) as Record<string, DutyObligationRecord>
}

function createRoleIndexBag(): Record<string, readonly string[]> {
  return Object.create(null) as Record<string, readonly string[]>
}

function parseAuthoritativePeriodWindow(raw: unknown): AuthoritativePeriodWindow | undefined {
  if (!isRecord(raw)) return undefined
  if (!isNonNegativeInt(raw.startWeek) || !isNonNegativeInt(raw.endWeek)) return undefined
  if (raw.endWeek < raw.startWeek) return undefined
  return Object.freeze({ startWeek: raw.startWeek, endWeek: raw.endWeek })
}

function freezeObligationRecord(record: DutyObligationRecord): DutyObligationRecord {
  return Object.freeze({
    id: record.id,
    roleId: record.roleId,
    dutyKind: record.dutyKind,
    mode: record.mode,
    ...(record.subjectScope !== undefined ? { subjectScope: record.subjectScope } : {}),
    ...(record.requirementBinding !== undefined
      ? { requirementBinding: record.requirementBinding }
      : {}),
    ...(record.periodWindow !== undefined
      ? { periodWindow: Object.freeze({ ...record.periodWindow }) }
      : {}),
    ...(record.qualifyingActionRef !== undefined
      ? { qualifyingActionRef: record.qualifyingActionRef }
      : {}),
  })
}

export function parseSpe2805TerminalDecisionProvenance(
  raw: unknown
): Spe2805TerminalDecisionProvenance | undefined {
  if (!isRecord(raw)) return undefined
  if (!isNonEmptyString(raw.decisionRef) || !isTerminalKind(raw.kind)) return undefined
  const terminalReason =
    raw.terminalReason === undefined
      ? undefined
      : isNonEmptyString(raw.terminalReason)
        ? raw.terminalReason.trim()
        : undefined
  if (raw.terminalReason !== undefined && terminalReason === undefined) return undefined
  return Object.freeze({
    decisionRef: raw.decisionRef.trim(),
    kind: raw.kind,
    ...(terminalReason !== undefined ? { terminalReason } : {}),
  })
}

export function parseDutyObligationRecord(raw: unknown): DutyObligationRecord | undefined {
  if (!isRecord(raw)) return undefined
  if (!isSafeId(raw.id) || !isDutyRoleId(raw.roleId)) return undefined
  if (!isDutyKind(raw.dutyKind) || !isObligationMode(raw.mode)) return undefined
  const id = raw.id.trim()
  const subjectScope =
    raw.subjectScope === undefined
      ? undefined
      : isNonEmptyString(raw.subjectScope)
        ? raw.subjectScope.trim()
        : undefined
  if (raw.subjectScope !== undefined && subjectScope === undefined) return undefined
  const requirementBinding =
    raw.requirementBinding === undefined
      ? undefined
      : isNonEmptyString(raw.requirementBinding)
        ? raw.requirementBinding.trim()
        : undefined
  if (raw.requirementBinding !== undefined && requirementBinding === undefined) return undefined
  const periodWindow =
    raw.periodWindow === undefined ? undefined : parseAuthoritativePeriodWindow(raw.periodWindow)
  if (raw.periodWindow !== undefined && periodWindow === undefined) return undefined
  const qualifyingActionRef =
    raw.qualifyingActionRef === undefined
      ? undefined
      : isNonEmptyString(raw.qualifyingActionRef)
        ? raw.qualifyingActionRef.trim()
        : undefined
  if (raw.qualifyingActionRef !== undefined && qualifyingActionRef === undefined) return undefined
  return freezeObligationRecord({
    id,
    roleId: raw.roleId,
    dutyKind: raw.dutyKind,
    mode: raw.mode,
    ...(subjectScope !== undefined ? { subjectScope } : {}),
    ...(requirementBinding !== undefined ? { requirementBinding } : {}),
    ...(periodWindow !== undefined ? { periodWindow } : {}),
    ...(qualifyingActionRef !== undefined ? { qualifyingActionRef } : {}),
  })
}

function buildRoleIndex(
  obligations: Readonly<Record<string, DutyObligationRecord>>
): Readonly<Record<string, readonly string[]>> {
  const bag = createRoleIndexBag()
  for (const record of Object.values(obligations)) {
    const existing = bag[record.roleId]
    if (existing === undefined) {
      bag[record.roleId] = Object.freeze([record.id])
    } else if (!existing.includes(record.id)) {
      bag[record.roleId] = Object.freeze([...existing, record.id])
    }
  }
  for (const roleId of Object.keys(bag)) {
    bag[roleId] = Object.freeze([...bag[roleId]].sort())
  }
  return Object.freeze(bag)
}

export function parseDutyObligationRegistry(raw: unknown): DutyObligationRegistry | null {
  if (!isRecord(raw)) return null
  if (raw.schemaVersion !== DUTY_OBLIGATION_REGISTRY_SCHEMA_VERSION) return null
  if (!isRecord(raw.obligations)) return null
  const obligations = createObligationsBag()
  const keys = Object.keys(raw.obligations)
  if (keys.length > DUTY_OBLIGATION_REGISTRY_MAX_RECORDS) return null
  for (const key of keys) {
    if (!isSafeId(key)) return null
    const parsed = parseDutyObligationRecord(raw.obligations[key])
    if (parsed === undefined || parsed.id !== key) return null
    if (obligations[key] !== undefined) return null
    obligations[key] = parsed
  }
  const roleIndex = buildRoleIndex(obligations)
  return Object.freeze({
    schemaVersion: DUTY_OBLIGATION_REGISTRY_SCHEMA_VERSION,
    obligations: Object.freeze({ ...obligations }),
    roleIndex,
  })
}

export function createEmptyDutyObligationRegistry(): DutyObligationRegistry {
  return Object.freeze({
    schemaVersion: DUTY_OBLIGATION_REGISTRY_SCHEMA_VERSION,
    obligations: Object.freeze(createObligationsBag()),
    roleIndex: Object.freeze(createRoleIndexBag()),
  })
}

export function lookupObligationsForRole(
  registry: DutyObligationRegistry,
  roleId: unknown
): readonly DutyObligationRecord[] {
  if (!isDutyRoleId(roleId)) return Object.freeze([])
  const ids = registry.roleIndex[roleId]
  if (ids === undefined) return Object.freeze([])
  return Object.freeze(
    ids.map((id) => registry.obligations[id]).filter((record): record is DutyObligationRecord => record !== undefined)
  )
}

function isTerminalNonActionable(kind: TerminalDecisionProvenanceKind): boolean {
  return kind === 'expired' || kind === 'superseded' || kind === 'canceled'
}

/**
 * Evaluate an omission-watch duty against observed action and SPE-2805 provenance.
 */
export function evaluateOmissionAgainstDuty(input: {
  readonly obligation: DutyObligationRecord
  readonly provenance: Spe2805TerminalDecisionProvenance
  readonly actObserved: boolean
}): OmissionEvaluation {
  const { obligation, provenance, actObserved } = input
  if (obligation.mode !== 'omission_watch') {
    return Object.freeze({
      obligationId: obligation.id,
      result: 'not_applicable',
      reasonCodes: Object.freeze(['mode:not_omission_watch']),
    })
  }
  if (provenance.kind === 'explicit_refusal') {
    return Object.freeze({
      obligationId: obligation.id,
      result: 'explicit_refusal_recorded',
      reasonCodes: Object.freeze([
        'omission:explicit_refusal',
        `decision:${provenance.decisionRef}`,
      ]),
    })
  }
  if (isTerminalNonActionable(provenance.kind)) {
    return Object.freeze({
      obligationId: obligation.id,
      result: 'no_omission_terminal_window',
      reasonCodes: Object.freeze([
        'omission:terminal_window',
        `terminal:${provenance.kind}`,
        `decision:${provenance.decisionRef}`,
      ]),
    })
  }
  if (actObserved) {
    return Object.freeze({
      obligationId: obligation.id,
      result: 'act_observed_compliant',
      reasonCodes: Object.freeze(['omission:act_observed']),
    })
  }
  if (provenance.kind === 'actionable') {
    return Object.freeze({
      obligationId: obligation.id,
      result: 'actionable_omission',
      reasonCodes: Object.freeze([
        'omission:actionable_breach',
        `duty:${obligation.dutyKind}`,
        `decision:${provenance.decisionRef}`,
      ]),
    })
  }
  return Object.freeze({
    obligationId: obligation.id,
    result: 'not_applicable',
    reasonCodes: Object.freeze(['omission:unclassified_provenance']),
  })
}

function periodKey(window: AuthoritativePeriodWindow): string {
  return `${window.startWeek}-${window.endWeek}`
}

function weekInPeriod(week: number, window: AuthoritativePeriodWindow): boolean {
  return week >= window.startWeek && week <= window.endWeek
}

/**
 * Period-bound qualifying obligation: satisfied vs noncompliant vs terminal impossibility.
 */
export function evaluatePeriodBoundObligation(input: {
  readonly obligation: DutyObligationRecord
  readonly campaignWeek: number
  readonly qualifyingActionWeek?: number
  readonly terminalProvenance?: Spe2805TerminalDecisionProvenance
  readonly priorPeriodOutcome?: PeriodComplianceResult
}): PeriodComplianceEvaluation {
  const { obligation, campaignWeek, qualifyingActionWeek, terminalProvenance, priorPeriodOutcome } =
    input
  const window = obligation.periodWindow
  if (window === undefined) {
    return Object.freeze({
      obligationId: obligation.id,
      periodKey: 'none',
      result: 'not_period_bound',
      reasonCodes: Object.freeze(['period:not_bound']),
    })
  }
  const key = periodKey(window)
  const auditable =
    priorPeriodOutcome !== undefined
      ? { auditablePriorPeriodOutcome: priorPeriodOutcome }
      : {}

  if (
    terminalProvenance !== undefined &&
    isTerminalNonActionable(terminalProvenance.kind) &&
    qualifyingActionWeek === undefined
  ) {
    return Object.freeze({
      obligationId: obligation.id,
      periodKey: key,
      result: 'period_terminal_no_breach',
      ...auditable,
      reasonCodes: Object.freeze([
        'period:terminal_no_breach',
        `terminal:${terminalProvenance.kind}`,
      ]),
    })
  }

  if (
    qualifyingActionWeek !== undefined &&
    isNonNegativeInt(qualifyingActionWeek) &&
    isNonNegativeInt(campaignWeek) &&
    qualifyingActionWeek <= campaignWeek &&
    weekInPeriod(qualifyingActionWeek, window)
  ) {
    return Object.freeze({
      obligationId: obligation.id,
      periodKey: key,
      result: 'period_satisfied',
      ...auditable,
      reasonCodes: Object.freeze([
        'period:qualifying_action_in_window',
        `action_week:${qualifyingActionWeek}`,
      ]),
    })
  }

  if (campaignWeek > window.endWeek) {
    return Object.freeze({
      obligationId: obligation.id,
      periodKey: key,
      result: 'period_noncompliant',
      ...auditable,
      reasonCodes: Object.freeze(['period:closed_without_qualification']),
    })
  }

  return Object.freeze({
    obligationId: obligation.id,
    periodKey: key,
    result: 'period_pending',
    ...auditable,
    reasonCodes: Object.freeze(['period:open']),
  })
}

function obligationAppliesToRequirement(
  obligation: DutyObligationRecord,
  projection: DutyConsumptionProjection
): boolean {
  if (obligation.requirementBinding === undefined) return true
  return obligation.requirementBinding === projection.requirementId
}

function subjectMatches(
  obligation: DutyObligationRecord,
  projection: DutyConsumptionProjection
): boolean {
  if (obligation.subjectScope === undefined) return true
  return obligation.subjectScope === projection.subjectRef
}

/**
 * Downstream duty evaluation consuming SPE-3181 `DutyConsumptionProjection`.
 * Requirement outcome remains authority; duty interprets responsibility only.
 */
export function evaluateDutyAgainstRequirementOutcome(
  registry: DutyObligationRegistry,
  roleId: DutyRoleId,
  requirementOutcome: DutyConsumptionProjection,
  context: DutyEvaluationContext = {}
): DutyRequirementEvaluation | undefined {
  if (requirementOutcome.dutyOwner !== DUTY_OBLIGATION_REGISTRY_OWNER) return undefined
  if (!requirementOutcome.requirementRemainsAuthority) return undefined

  const candidates = lookupObligationsForRole(registry, roleId)
    .filter(
      (obligation) =>
        obligationAppliesToRequirement(obligation, requirementOutcome) &&
        subjectMatches(obligation, requirementOutcome)
    )
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
  if (candidates.length === 0) return undefined

  // Deterministic first-match: lowest obligation id among bindings for this requirement/subject.
  const obligation = candidates[0]!
  const reasonBase = Object.freeze([
    'duty:consumes_requirement_outcome',
    `requirement:${requirementOutcome.requirementId}`,
    `state:${requirementOutcome.fulfillmentOutcome}`,
    ...(candidates.length > 1
      ? ([`duty:first_match_of_${candidates.length}`] as const)
      : ([] as const)),
  ])

  if (obligation.periodWindow !== undefined && context.campaignWeek !== undefined) {
    const period = evaluatePeriodBoundObligation({
      obligation,
      campaignWeek: context.campaignWeek,
      qualifyingActionWeek: context.qualifyingActionWeek,
      terminalProvenance: context.provenance,
    })
    if (period.result === 'period_terminal_no_breach') {
      return Object.freeze({
        obligationId: obligation.id,
        roleId: obligation.roleId,
        compliance: 'terminal_no_breach',
        requirementRemainsAuthority: true,
        fulfillmentOutcome: requirementOutcome.fulfillmentOutcome,
        reasonCodes: Object.freeze([...reasonBase, ...period.reasonCodes]),
      })
    }
    if (period.result === 'period_satisfied') {
      return Object.freeze({
        obligationId: obligation.id,
        roleId: obligation.roleId,
        compliance: 'compliant',
        requirementRemainsAuthority: true,
        fulfillmentOutcome: requirementOutcome.fulfillmentOutcome,
        reasonCodes: Object.freeze([...reasonBase, ...period.reasonCodes]),
      })
    }
    if (period.result === 'period_noncompliant') {
      return Object.freeze({
        obligationId: obligation.id,
        roleId: obligation.roleId,
        compliance: 'breach',
        requirementRemainsAuthority: true,
        fulfillmentOutcome: requirementOutcome.fulfillmentOutcome,
        reasonCodes: Object.freeze([...reasonBase, ...period.reasonCodes]),
      })
    }
    if (period.result === 'period_pending') {
      return Object.freeze({
        obligationId: obligation.id,
        roleId: obligation.roleId,
        compliance: 'pending',
        requirementRemainsAuthority: true,
        fulfillmentOutcome: requirementOutcome.fulfillmentOutcome,
        reasonCodes: Object.freeze([...reasonBase, ...period.reasonCodes]),
      })
    }
  }

  if (obligation.mode === 'omission_watch' && context.provenance !== undefined) {
    const omission = evaluateOmissionAgainstDuty({
      obligation,
      provenance: context.provenance,
      actObserved: context.actObserved === true,
    })
    if (omission.result === 'actionable_omission') {
      return Object.freeze({
        obligationId: obligation.id,
        roleId: obligation.roleId,
        compliance: 'breach',
        requirementRemainsAuthority: true,
        fulfillmentOutcome: requirementOutcome.fulfillmentOutcome,
        reasonCodes: Object.freeze([...reasonBase, ...omission.reasonCodes]),
      })
    }
    if (omission.result === 'no_omission_terminal_window') {
      return Object.freeze({
        obligationId: obligation.id,
        roleId: obligation.roleId,
        compliance: 'terminal_no_breach',
        requirementRemainsAuthority: true,
        fulfillmentOutcome: requirementOutcome.fulfillmentOutcome,
        reasonCodes: Object.freeze([...reasonBase, ...omission.reasonCodes]),
      })
    }
    if (omission.result === 'act_observed_compliant') {
      return Object.freeze({
        obligationId: obligation.id,
        roleId: obligation.roleId,
        compliance: 'compliant',
        requirementRemainsAuthority: true,
        fulfillmentOutcome: requirementOutcome.fulfillmentOutcome,
        reasonCodes: Object.freeze([
          ...reasonBase,
          ...omission.reasonCodes,
          'duty:act_observed_preserves_compliance',
        ]),
      })
    }
    if (omission.result === 'explicit_refusal_recorded') {
      return Object.freeze({
        obligationId: obligation.id,
        roleId: obligation.roleId,
        compliance: 'refused',
        requirementRemainsAuthority: true,
        fulfillmentOutcome: requirementOutcome.fulfillmentOutcome,
        reasonCodes: Object.freeze([...reasonBase, ...omission.reasonCodes]),
      })
    }
  }

  if (requirementOutcome.fulfillmentOutcome === 'deficient') {
    return Object.freeze({
      obligationId: obligation.id,
      roleId: obligation.roleId,
      compliance: 'breach',
      requirementRemainsAuthority: true,
      fulfillmentOutcome: requirementOutcome.fulfillmentOutcome,
      reasonCodes: Object.freeze([...reasonBase, 'duty:requirement_deficient']),
    })
  }

  if (requirementOutcome.fulfillmentOutcome === 'satisfied') {
    return Object.freeze({
      obligationId: obligation.id,
      roleId: obligation.roleId,
      compliance: 'compliant',
      requirementRemainsAuthority: true,
      fulfillmentOutcome: requirementOutcome.fulfillmentOutcome,
      reasonCodes: Object.freeze([...reasonBase, 'duty:requirement_satisfied']),
    })
  }

  return Object.freeze({
    obligationId: obligation.id,
    roleId: obligation.roleId,
    compliance: 'pending',
    requirementRemainsAuthority: true,
    fulfillmentOutcome: requirementOutcome.fulfillmentOutcome,
    reasonCodes: Object.freeze([...reasonBase, 'duty:requirement_pending']),
  })
}

export const FIELD_LEAD_CONTAINMENT_ESCALATION_OBLIGATION: DutyObligationRecord = Object.freeze({
  id: 'duty:field-lead:containment-escalation',
  roleId: 'field_lead',
  dutyKind: 'escalation',
  mode: 'omission_watch',
  requirementBinding: 'req:containment-info',
  subjectScope: 'subject:anomaly-alpha',
})

export const ARCHIVIST_RECORD_UPKEEP_PERIOD_OBLIGATION: DutyObligationRecord = Object.freeze({
  id: 'duty:archivist:record-upkeep-q1',
  roleId: 'archivist',
  dutyKind: 'record_upkeep',
  mode: 'act_required',
  periodWindow: Object.freeze({ startWeek: 10, endWeek: 12 }),
  qualifyingActionRef: 'act:archive-review',
})

function registryFromRecords(records: readonly DutyObligationRecord[]): DutyObligationRegistry {
  const obligations = createObligationsBag()
  for (const record of records) {
    obligations[record.id] = record
  }
  return Object.freeze({
    schemaVersion: DUTY_OBLIGATION_REGISTRY_SCHEMA_VERSION,
    obligations: Object.freeze({ ...obligations }),
    roleIndex: buildRoleIndex(obligations),
  })
}

export const DEMO_DUTY_OBLIGATION_REGISTRY: DutyObligationRegistry = registryFromRecords([
  FIELD_LEAD_CONTAINMENT_ESCALATION_OBLIGATION,
  ARCHIVIST_RECORD_UPKEEP_PERIOD_OBLIGATION,
])
