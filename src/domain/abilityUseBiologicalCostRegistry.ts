/**
 * SPE-2142 slice 1: ability-use biological cost registry.
 *
 * Pure deterministic registry for cumulative health debt incurred when personnel
 * use anomalous abilities. Distinct from immediate activation cost (fuel / spend)
 * and from responder exertion (SPE-1107), medical workflows, and welfare ledgers.
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type AbilityUseBiologicalCostId = string

export type BiologicalConsentState =
  'not_required' | 'pending' | 'granted' | 'refused' | 'revoked' | 'expired'

export const BIOLOGICAL_CONSENT_STATES: readonly BiologicalConsentState[] = [
  'not_required',
  'pending',
  'granted',
  'refused',
  'revoked',
  'expired',
] as const

export type BiologicalMonitoringState =
  'not_required' | 'scheduled' | 'active' | 'overdue' | 'waived' | 'failed'

export const BIOLOGICAL_MONITORING_STATES: readonly BiologicalMonitoringState[] = [
  'not_required',
  'scheduled',
  'active',
  'overdue',
  'waived',
  'failed',
] as const

export type HealthDebtSeverity = 'none' | 'low' | 'moderate' | 'high' | 'critical'

export const HEALTH_DEBT_SEVERITIES: readonly HealthDebtSeverity[] = [
  'none',
  'low',
  'moderate',
  'high',
  'critical',
] as const

export type ImmunodeficiencyRiskBand = 'negligible' | 'elevated' | 'high' | 'severe'

export const IMMUNODEFICIENCY_RISK_BANDS: readonly ImmunodeficiencyRiskBand[] = [
  'negligible',
  'elevated',
  'high',
  'severe',
] as const

/** Immediate activation spend — not the same as accumulated biological debt. */
export type ImmediateActivationCostKind =
  'none' | 'self_harm' | 'blood_loss' | 'vitality_sacrifice' | 'irreducible_stress'

export const IMMEDIATE_ACTIVATION_COST_KINDS: readonly ImmediateActivationCostKind[] = [
  'none',
  'self_harm',
  'blood_loss',
  'vitality_sacrifice',
  'irreducible_stress',
] as const

// ---------------------------------------------------------------------------
// Thresholds and bounds
// ---------------------------------------------------------------------------

/** Use counts above this require active or scheduled monitoring when risk is elevated+. */
export const BIOLOGICAL_COST_REVIEW_USE_THRESHOLD = 3 as const

/** Immunodeficiency bands that require consent + monitoring review. */
export const BIOLOGICAL_COST_REVIEW_RISK_BANDS: ReadonlySet<ImmunodeficiencyRiskBand> = new Set([
  'elevated',
  'high',
  'severe',
])

export const BIOLOGICAL_COST_MAX_USE_COUNT = 10_000 as const

export const BIOLOGICAL_COST_MAX_ACTIVATION_UNITS = 100 as const

export const BIOLOGICAL_COST_MAX_ACCUMULATED_UNITS = 10_000 as const

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface AbilityUseBiologicalCostRecord {
  readonly id: AbilityUseBiologicalCostId
  readonly label: string
  /** Actor or staff reference — opaque id owned by personnel/actor systems. */
  readonly actorRef: string
  /** Bounded successful anomalous-ability uses contributing to this ledger. */
  readonly useCount: number
  /** Unique organ-system / stress pathway references (opaque ids). */
  readonly organStressRefs: readonly string[]
  readonly immunodeficiencyRisk: ImmunodeficiencyRiskBand
  readonly consentState: BiologicalConsentState
  readonly monitoringState: BiologicalMonitoringState
  readonly healthDebtSeverity: HealthDebtSeverity
  /** Immediate per-activation spend kind (fuel), separate from cumulative debt. */
  readonly immediateActivationCostKind: ImmediateActivationCostKind
  /** Immediate units spent on the latest activation (0–100). */
  readonly immediateActivationCostUnits: number
  /** Accumulated biological damage units across uses (0–10000). */
  readonly accumulatedHealthDebtUnits: number
  /** Optional opaque refs to existing consent / monitoring / readiness owners. */
  readonly consentObligationRef?: string
  readonly monitoringObligationRef?: string
  readonly readinessRef?: string
  readonly summary?: string
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type AbilityUseBiologicalCostValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'missing_actor_ref'
  | 'invalid_use_count'
  | 'empty_organ_stress_refs'
  | 'duplicate_organ_stress_ref'
  | 'blank_organ_stress_ref'
  | 'invalid_immunodeficiency_risk'
  | 'invalid_consent_state'
  | 'invalid_monitoring_state'
  | 'invalid_health_debt_severity'
  | 'invalid_immediate_activation_cost_kind'
  | 'invalid_immediate_activation_cost_units'
  | 'invalid_accumulated_health_debt_units'
  | 'consent_required_above_review_threshold'
  | 'monitoring_required_above_review_threshold'
  | 'severity_inconsistent_with_risk'
  | 'debt_units_inconsistent_with_severity'
  | 'activation_cost_without_kind'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'
  | 'franchise_token_in_field'

export interface AbilityUseBiologicalCostValidationIssue {
  readonly code: AbilityUseBiologicalCostValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface AbilityUseBiologicalCostValidationResult {
  readonly valid: boolean
  readonly issues: readonly AbilityUseBiologicalCostValidationIssue[]
}

// ---------------------------------------------------------------------------
// Projection (downstream consumers)
// ---------------------------------------------------------------------------

export interface AbilityUseBiologicalCostProjection {
  readonly recordId: AbilityUseBiologicalCostId
  readonly actorRef: string
  readonly useCount: number
  readonly organStressRefs: readonly string[]
  readonly immunodeficiencyRisk: ImmunodeficiencyRiskBand
  readonly healthDebtSeverity: HealthDebtSeverity
  readonly accumulatedHealthDebtUnits: number
  readonly immediateActivationCostKind: ImmediateActivationCostKind
  readonly immediateActivationCostUnits: number
  readonly consentState: BiologicalConsentState
  readonly monitoringState: BiologicalMonitoringState
  readonly consentObligationRef: string | null
  readonly monitoringObligationRef: string | null
  readonly readinessRef: string | null
  readonly requiresReview: boolean
  /** True when accumulated debt is present independently of immediate activation spend. */
  readonly hasAccumulatedBiologicalDebt: boolean
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const CONSENT_SET = new Set<string>(BIOLOGICAL_CONSENT_STATES)
const MONITORING_SET = new Set<string>(BIOLOGICAL_MONITORING_STATES)
const SEVERITY_SET = new Set<string>(HEALTH_DEBT_SEVERITIES)
const RISK_SET = new Set<string>(IMMUNODEFICIENCY_RISK_BANDS)
const ACTIVATION_KIND_SET = new Set<string>(IMMEDIATE_ACTIVATION_COST_KINDS)

const LEGAL_CONSENT_FOR_REVIEW = new Set<BiologicalConsentState>(['granted', 'not_required'])
const LEGAL_MONITORING_FOR_REVIEW = new Set<BiologicalMonitoringState>([
  'scheduled',
  'active',
  'waived',
  'not_required',
])

export const FRANCHISE_TOKEN_PATTERN =
  /(?:\b(?:scp|mtf|mobile task force|foundation|goc|gru|uiu|chaos insurgency|group of interest|broken masquerade|masquerade breach)\b|goi-)/i

export const BRANDED_OBJECT_NUMBER_PATTERN = /\bSCP[\s-]?\d{3,4}\b/i

const SEVERITY_RANK: Record<HealthDebtSeverity, number> = {
  none: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
}

const RISK_RANK: Record<ImmunodeficiencyRiskBand, number> = {
  negligible: 0,
  elevated: 1,
  high: 2,
  severe: 3,
}

const MIN_DEBT_UNITS_FOR_SEVERITY: Record<HealthDebtSeverity, number> = {
  none: 0,
  low: 1,
  moderate: 10,
  high: 40,
  critical: 100,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function pushIssue(
  issues: AbilityUseBiologicalCostValidationIssue[],
  issue: AbilityUseBiologicalCostValidationIssue
): void {
  issues.push(issue)
}

function containsFranchiseToken(value: string): boolean {
  const token = normalizeToken(value)
  return (
    token.length > 0 &&
    (FRANCHISE_TOKEN_PATTERN.test(token) || BRANDED_OBJECT_NUMBER_PATTERN.test(token))
  )
}

function isSafeIntInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max
}

function requiresBiologicalReview(record: AbilityUseBiologicalCostRecord): boolean {
  return (
    record.useCount >= BIOLOGICAL_COST_REVIEW_USE_THRESHOLD ||
    BIOLOGICAL_COST_REVIEW_RISK_BANDS.has(record.immunodeficiencyRisk)
  )
}

function sortedUniqueOrganRefs(refs: readonly string[]): {
  readonly refs: readonly string[]
  readonly duplicates: readonly string[]
  readonly blanks: number
} {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  let blanks = 0
  const cleaned: string[] = []

  for (const raw of refs) {
    const token = normalizeToken(raw)
    if (token.length === 0) {
      blanks += 1
      continue
    }
    if (seen.has(token)) {
      duplicates.add(token)
      continue
    }
    seen.add(token)
    cleaned.push(token)
  }

  cleaned.sort((left, right) => left.localeCompare(right))
  return {
    refs: cleaned,
    duplicates: [...duplicates].sort((left, right) => left.localeCompare(right)),
    blanks,
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateAbilityUseBiologicalCostRecord(
  record: AbilityUseBiologicalCostRecord
): AbilityUseBiologicalCostValidationResult {
  const issues: AbilityUseBiologicalCostValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)
  const actorRef = normalizeToken(record.actorRef)

  if (id.length === 0) {
    pushIssue(issues, {
      code: 'missing_id',
      detail: 'Ability-use biological cost record requires a nonempty id.',
      severity: 'error',
    })
  } else if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      detail: `Ability-use biological cost record ${id} id contains a franchise token.`,
      severity: 'error',
      relatedIds: [id],
    })
  }

  if (label.length === 0) {
    pushIssue(issues, {
      code: 'missing_label',
      detail: `Ability-use biological cost record ${id || '(unknown)'} requires a nonempty label.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  } else if (containsFranchiseToken(label)) {
    pushIssue(issues, {
      code: 'franchise_token_in_label',
      detail: `Ability-use biological cost record ${id || '(unknown)'} label contains a franchise token.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (actorRef.length === 0) {
    pushIssue(issues, {
      code: 'missing_actor_ref',
      detail: `Ability-use biological cost record ${id || '(unknown)'} requires a nonempty actorRef.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isSafeIntInRange(record.useCount, 0, BIOLOGICAL_COST_MAX_USE_COUNT)) {
    pushIssue(issues, {
      code: 'invalid_use_count',
      detail: `Ability-use biological cost record ${id || '(unknown)'} useCount must be a safe integer 0–${BIOLOGICAL_COST_MAX_USE_COUNT}.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  const organRefs = Array.isArray(record.organStressRefs) ? record.organStressRefs : []
  const { refs, duplicates, blanks } = sortedUniqueOrganRefs(organRefs)

  if (blanks > 0) {
    pushIssue(issues, {
      code: 'blank_organ_stress_ref',
      detail: `Ability-use biological cost record ${id || '(unknown)'} has ${blanks} blank organ-stress reference(s).`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (duplicates.length > 0) {
    pushIssue(issues, {
      code: 'duplicate_organ_stress_ref',
      detail: `Ability-use biological cost record ${id || '(unknown)'} has duplicate organ-stress refs: ${duplicates.join(', ')}.`,
      severity: 'error',
      relatedIds: id ? [id, ...duplicates] : duplicates,
    })
  }

  if (refs.length === 0) {
    pushIssue(issues, {
      code: 'empty_organ_stress_refs',
      detail: `Ability-use biological cost record ${id || '(unknown)'} requires at least one unique organ-stress reference.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!RISK_SET.has(record.immunodeficiencyRisk)) {
    pushIssue(issues, {
      code: 'invalid_immunodeficiency_risk',
      detail: `Ability-use biological cost record ${id || '(unknown)'} has invalid immunodeficiencyRisk.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!CONSENT_SET.has(record.consentState)) {
    pushIssue(issues, {
      code: 'invalid_consent_state',
      detail: `Ability-use biological cost record ${id || '(unknown)'} has invalid consentState.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!MONITORING_SET.has(record.monitoringState)) {
    pushIssue(issues, {
      code: 'invalid_monitoring_state',
      detail: `Ability-use biological cost record ${id || '(unknown)'} has invalid monitoringState.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!SEVERITY_SET.has(record.healthDebtSeverity)) {
    pushIssue(issues, {
      code: 'invalid_health_debt_severity',
      detail: `Ability-use biological cost record ${id || '(unknown)'} has invalid healthDebtSeverity.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!ACTIVATION_KIND_SET.has(record.immediateActivationCostKind)) {
    pushIssue(issues, {
      code: 'invalid_immediate_activation_cost_kind',
      detail: `Ability-use biological cost record ${id || '(unknown)'} has invalid immediateActivationCostKind.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    !isSafeIntInRange(record.immediateActivationCostUnits, 0, BIOLOGICAL_COST_MAX_ACTIVATION_UNITS)
  ) {
    pushIssue(issues, {
      code: 'invalid_immediate_activation_cost_units',
      detail: `Ability-use biological cost record ${id || '(unknown)'} immediateActivationCostUnits must be a safe integer 0–${BIOLOGICAL_COST_MAX_ACTIVATION_UNITS}.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    !isSafeIntInRange(record.accumulatedHealthDebtUnits, 0, BIOLOGICAL_COST_MAX_ACCUMULATED_UNITS)
  ) {
    pushIssue(issues, {
      code: 'invalid_accumulated_health_debt_units',
      detail: `Ability-use biological cost record ${id || '(unknown)'} accumulatedHealthDebtUnits must be a safe integer 0–${BIOLOGICAL_COST_MAX_ACCUMULATED_UNITS}.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    RISK_SET.has(record.immunodeficiencyRisk) &&
    SEVERITY_SET.has(record.healthDebtSeverity) &&
    SEVERITY_RANK[record.healthDebtSeverity] < RISK_RANK[record.immunodeficiencyRisk]
  ) {
    pushIssue(issues, {
      code: 'severity_inconsistent_with_risk',
      detail: `Ability-use biological cost record ${id || '(unknown)'} healthDebtSeverity (${record.healthDebtSeverity}) is below immunodeficiencyRisk (${record.immunodeficiencyRisk}).`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    SEVERITY_SET.has(record.healthDebtSeverity) &&
    isSafeIntInRange(record.accumulatedHealthDebtUnits, 0, BIOLOGICAL_COST_MAX_ACCUMULATED_UNITS) &&
    record.accumulatedHealthDebtUnits < MIN_DEBT_UNITS_FOR_SEVERITY[record.healthDebtSeverity]
  ) {
    pushIssue(issues, {
      code: 'debt_units_inconsistent_with_severity',
      detail: `Ability-use biological cost record ${id || '(unknown)'} accumulatedHealthDebtUnits (${record.accumulatedHealthDebtUnits}) is below the minimum for severity ${record.healthDebtSeverity}.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    isSafeIntInRange(
      record.immediateActivationCostUnits,
      0,
      BIOLOGICAL_COST_MAX_ACTIVATION_UNITS
    ) &&
    record.immediateActivationCostUnits > 0 &&
    record.immediateActivationCostKind === 'none'
  ) {
    pushIssue(issues, {
      code: 'activation_cost_without_kind',
      detail: `Ability-use biological cost record ${id || '(unknown)'} reports immediate activation units without a cost kind.`,
      severity: 'error',
      relatedIds: id ? [id] : undefined,
    })
  }

  const reviewNeeded =
    isSafeIntInRange(record.useCount, 0, BIOLOGICAL_COST_MAX_USE_COUNT) &&
    RISK_SET.has(record.immunodeficiencyRisk) &&
    requiresBiologicalReview(record)

  if (reviewNeeded && CONSENT_SET.has(record.consentState)) {
    if (!LEGAL_CONSENT_FOR_REVIEW.has(record.consentState)) {
      pushIssue(issues, {
        code: 'consent_required_above_review_threshold',
        detail: `Ability-use biological cost record ${id || '(unknown)'} requires granted or not_required consent above the biological review threshold (useCount=${record.useCount}, risk=${record.immunodeficiencyRisk}).`,
        severity: 'error',
        relatedIds: id ? [id] : undefined,
      })
    } else if (
      record.consentState === 'not_required' &&
      BIOLOGICAL_COST_REVIEW_RISK_BANDS.has(record.immunodeficiencyRisk)
    ) {
      pushIssue(issues, {
        code: 'consent_required_above_review_threshold',
        detail: `Ability-use biological cost record ${id || '(unknown)'} cannot mark consent not_required when immunodeficiencyRisk is ${record.immunodeficiencyRisk}.`,
        severity: 'error',
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  if (reviewNeeded && MONITORING_SET.has(record.monitoringState)) {
    if (
      !LEGAL_MONITORING_FOR_REVIEW.has(record.monitoringState) ||
      (record.monitoringState === 'not_required' &&
        BIOLOGICAL_COST_REVIEW_RISK_BANDS.has(record.immunodeficiencyRisk)) ||
      (record.monitoringState === 'waived' && record.immunodeficiencyRisk === 'severe')
    ) {
      pushIssue(issues, {
        code: 'monitoring_required_above_review_threshold',
        detail: `Ability-use biological cost record ${id || '(unknown)'} requires scheduled/active monitoring (or a legal waiver) above the biological review threshold.`,
        severity: 'error',
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  for (const field of [
    record.summary,
    record.consentObligationRef,
    record.monitoringObligationRef,
    record.readinessRef,
  ]) {
    if (typeof field === 'string' && containsFranchiseToken(field)) {
      pushIssue(issues, {
        code: 'franchise_token_in_field',
        detail: `Ability-use biological cost record ${id || '(unknown)'} contains a franchise token in an optional field.`,
        severity: 'error',
        relatedIds: id ? [id] : undefined,
      })
      break
    }
  }

  const hasError = issues.some((issue) => issue.severity === 'error')
  return {
    valid: !hasError,
    issues,
  }
}

// ---------------------------------------------------------------------------
// Accumulation helper (deterministic, pure)
// ---------------------------------------------------------------------------

export interface AbilityUseAccumulationInput {
  readonly previous: AbilityUseBiologicalCostRecord
  /** Additional successful uses this step (1–100). */
  readonly additionalUses: number
  /** Immediate activation cost applied on this step. */
  readonly immediateActivationCostKind: ImmediateActivationCostKind
  readonly immediateActivationCostUnits: number
  /** Biological debt units added this step (0–1000). */
  readonly additionalHealthDebtUnits: number
  readonly immunodeficiencyRisk?: ImmunodeficiencyRiskBand
  readonly healthDebtSeverity?: HealthDebtSeverity
  readonly organStressRefsToAdd?: readonly string[]
  readonly consentState?: BiologicalConsentState
  readonly monitoringState?: BiologicalMonitoringState
}

function resolveSeverityForDebtUnits(
  units: number,
  preferred?: HealthDebtSeverity
): HealthDebtSeverity {
  let inferred: HealthDebtSeverity = 'none'
  if (units >= MIN_DEBT_UNITS_FOR_SEVERITY.critical) inferred = 'critical'
  else if (units >= MIN_DEBT_UNITS_FOR_SEVERITY.high) inferred = 'high'
  else if (units >= MIN_DEBT_UNITS_FOR_SEVERITY.moderate) inferred = 'moderate'
  else if (units >= MIN_DEBT_UNITS_FOR_SEVERITY.low) inferred = 'low'

  if (!preferred) return inferred
  return SEVERITY_RANK[preferred] >= SEVERITY_RANK[inferred] ? preferred : inferred
}

/**
 * Returns a new record with repeated-use accumulation applied.
 * Does not validate; callers should validate the result.
 */
export function accumulateAbilityUseBiologicalCost(
  input: AbilityUseAccumulationInput
): AbilityUseBiologicalCostRecord {
  const additionalUses = Math.trunc(input.additionalUses)
  const additionalDebt = Math.trunc(input.additionalHealthDebtUnits)
  const activationUnits = Math.trunc(input.immediateActivationCostUnits)

  const mergedOrgans = sortedUniqueOrganRefs([
    ...input.previous.organStressRefs,
    ...(input.organStressRefsToAdd ?? []),
  ]).refs

  const accumulatedHealthDebtUnits = Math.min(
    BIOLOGICAL_COST_MAX_ACCUMULATED_UNITS,
    Math.max(0, input.previous.accumulatedHealthDebtUnits + Math.max(0, additionalDebt))
  )

  const useCount = Math.min(
    BIOLOGICAL_COST_MAX_USE_COUNT,
    Math.max(0, input.previous.useCount + Math.max(0, additionalUses))
  )

  return {
    ...input.previous,
    useCount,
    organStressRefs: mergedOrgans,
    immunodeficiencyRisk: input.immunodeficiencyRisk ?? input.previous.immunodeficiencyRisk,
    consentState: input.consentState ?? input.previous.consentState,
    monitoringState: input.monitoringState ?? input.previous.monitoringState,
    healthDebtSeverity: resolveSeverityForDebtUnits(
      accumulatedHealthDebtUnits,
      input.healthDebtSeverity ?? input.previous.healthDebtSeverity
    ),
    immediateActivationCostKind: input.immediateActivationCostKind,
    immediateActivationCostUnits: Math.max(
      0,
      Math.min(BIOLOGICAL_COST_MAX_ACTIVATION_UNITS, activationUnits)
    ),
    accumulatedHealthDebtUnits,
  }
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

export function projectAbilityUseBiologicalCost(
  record: AbilityUseBiologicalCostRecord
): AbilityUseBiologicalCostProjection {
  const organStressRefs = sortedUniqueOrganRefs(
    Array.isArray(record.organStressRefs) ? record.organStressRefs : []
  ).refs

  return {
    recordId: normalizeToken(record.id),
    actorRef: normalizeToken(record.actorRef),
    useCount: record.useCount,
    organStressRefs,
    immunodeficiencyRisk: record.immunodeficiencyRisk,
    healthDebtSeverity: record.healthDebtSeverity,
    accumulatedHealthDebtUnits: record.accumulatedHealthDebtUnits,
    immediateActivationCostKind: record.immediateActivationCostKind,
    immediateActivationCostUnits: record.immediateActivationCostUnits,
    consentState: record.consentState,
    monitoringState: record.monitoringState,
    consentObligationRef: normalizeToken(record.consentObligationRef) || null,
    monitoringObligationRef: normalizeToken(record.monitoringObligationRef) || null,
    readinessRef: normalizeToken(record.readinessRef) || null,
    requiresReview: requiresBiologicalReview(record),
    hasAccumulatedBiologicalDebt: record.accumulatedHealthDebtUnits > 0,
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Valid low-risk single-use record with legal consent/monitoring. */
export const VALID_LOW_RISK_BIOLOGICAL_COST_FIXTURE: AbilityUseBiologicalCostRecord = {
  id: 'ability-bio-cost:operative-alpha-low',
  label: 'Operative alpha low biological cost',
  actorRef: 'staff:operative-alpha',
  useCount: 1,
  organStressRefs: ['organ-stress:nervous', 'organ-stress:hematologic'],
  immunodeficiencyRisk: 'negligible',
  consentState: 'granted',
  monitoringState: 'scheduled',
  healthDebtSeverity: 'low',
  immediateActivationCostKind: 'irreducible_stress',
  immediateActivationCostUnits: 4,
  accumulatedHealthDebtUnits: 3,
  consentObligationRef: 'consent:ability-use-alpha',
  monitoringObligationRef: 'monitor:ability-bio-alpha',
  readinessRef: 'readiness:operative-alpha',
  summary: 'Single anomalous ability use with bounded nervous and hematologic stress.',
}

/** Elevated-risk multi-use record requiring review obligations. */
export const VALID_REVIEW_THRESHOLD_BIOLOGICAL_COST_FIXTURE: AbilityUseBiologicalCostRecord = {
  id: 'ability-bio-cost:operative-beta-elevated',
  label: 'Operative beta elevated biological cost',
  actorRef: 'staff:operative-beta',
  useCount: 5,
  organStressRefs: ['organ-stress:immune', 'organ-stress:endocrine'],
  immunodeficiencyRisk: 'elevated',
  consentState: 'granted',
  monitoringState: 'active',
  healthDebtSeverity: 'moderate',
  immediateActivationCostKind: 'vitality_sacrifice',
  immediateActivationCostUnits: 12,
  accumulatedHealthDebtUnits: 28,
  consentObligationRef: 'consent:ability-use-beta',
  monitoringObligationRef: 'monitor:ability-bio-beta',
  readinessRef: 'readiness:operative-beta',
}
