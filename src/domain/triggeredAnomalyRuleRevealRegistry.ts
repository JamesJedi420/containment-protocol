/**
 * SPE-2172 slice 1: triggered anomaly-rule reveal registry.
 *
 * Pure deterministic evaluation for setup-gated, high-impact anomaly actions.
 * Magnitude tiers are consumed as SPE-1033 interaction-package references;
 * this module does not resolve anomaly effects or persist acknowledgement state.
 */

import { assertNonEmptyId } from './assertBoundedInteger'

export const TRIGGERED_ANOMALY_RULE_REVEAL_OWNER = 'SPE-2172' as const
export const ANOMALY_INTERACTION_PACKAGE_OWNER = 'SPE-1033' as const

export type AnomalyInteractionMagnitudeTier =
  'trivial' | 'local' | 'site' | 'regional' | 'civic_scale'

export const ANOMALY_INTERACTION_MAGNITUDE_TIERS: readonly AnomalyInteractionMagnitudeTier[] =
  Object.freeze(['trivial', 'local', 'site', 'regional', 'civic_scale'])

export type AnomalyResponseScale = 'routine' | 'specialist' | 'site_wide' | 'civic_emergency'

export const ANOMALY_RESPONSE_SCALES: readonly AnomalyResponseScale[] = Object.freeze([
  'routine',
  'specialist',
  'site_wide',
  'civic_emergency',
])

export interface HighImpactActionRevealTrigger {
  readonly kind: 'high_impact_action'
  readonly actionRef: string
  readonly requiredSetupRefs: readonly string[]
  readonly minimumMagnitudeTier: AnomalyInteractionMagnitudeTier
}

export interface TriggeredAnomalyRuleRevealRecord {
  readonly id: string
  readonly anomalyRef: string
  readonly hiddenRuleRef: string
  readonly procedureRefs: readonly string[]
  readonly trigger: HighImpactActionRevealTrigger
  readonly acknowledgementRequired: boolean
  readonly acknowledgementPrompt?: string
  readonly responseScaleBeforeReveal: AnomalyResponseScale
  readonly responseScaleAfterReveal: AnomalyResponseScale
}

export interface TriggeredAnomalyRuleRevealRegistry {
  readonly entries: readonly TriggeredAnomalyRuleRevealRecord[]
}

export type TriggeredAnomalyRuleRevealValidationCode =
  | 'missing_id'
  | 'missing_anomaly_ref'
  | 'missing_hidden_rule_ref'
  | 'missing_action_ref'
  | 'missing_setup_ref'
  | 'duplicate_setup_ref'
  | 'missing_procedure_ref'
  | 'duplicate_procedure_ref'
  | 'invalid_magnitude_tier'
  | 'invalid_response_scale'
  | 'unchanged_response_scale'
  | 'invalid_acknowledgement_requirement'
  | 'missing_acknowledgement_prompt'
  | 'untrimmed_reference'
  | 'duplicate_id'

export interface TriggeredAnomalyRuleRevealValidationIssue {
  readonly code: TriggeredAnomalyRuleRevealValidationCode
  readonly detail: string
}

export interface TriggeredAnomalyRuleRevealValidationResult {
  readonly valid: boolean
  readonly issues: readonly TriggeredAnomalyRuleRevealValidationIssue[]
}

export interface TriggeredAnomalyRuleRevealEvaluationInput {
  readonly anomalyRef: string
  readonly actionRef: string
  readonly completedSetupRefs: readonly string[]
  readonly magnitudeTier: AnomalyInteractionMagnitudeTier
  readonly acknowledgedRuleIds: readonly string[]
}

export type TriggeredAnomalyRuleRevealReason =
  | 'anomaly_not_applicable'
  | 'action_not_applicable'
  | 'setup_incomplete'
  | 'magnitude_below_trigger'
  | 'acknowledgement_required'
  | 'revealed'
  | 'acknowledged'

interface TriggeredAnomalyRuleRevealEvaluationBase {
  readonly status: 'hidden' | 'revealed' | 'acknowledged'
  readonly reason: TriggeredAnomalyRuleRevealReason
  readonly canProceed: boolean
  readonly allowedResponseScale: AnomalyResponseScale
  readonly missingSetupRefs: readonly string[]
  readonly owner: typeof TRIGGERED_ANOMALY_RULE_REVEAL_OWNER
  readonly magnitudeOwner: typeof ANOMALY_INTERACTION_PACKAGE_OWNER
}

export interface HiddenAnomalyRuleEvaluation extends TriggeredAnomalyRuleRevealEvaluationBase {
  readonly status: 'hidden'
  readonly ruleId?: never
  readonly hiddenRuleRef?: never
  readonly procedureRefs?: never
  readonly acknowledgementRequired?: never
  readonly acknowledgementPrompt?: never
}

export interface RevealedAnomalyRuleEvaluation extends TriggeredAnomalyRuleRevealEvaluationBase {
  readonly status: 'revealed'
  readonly ruleId: string
  readonly hiddenRuleRef: string
  readonly procedureRefs: readonly string[]
  readonly acknowledgementRequired: boolean
  readonly acknowledgementPrompt?: string
}

export interface AcknowledgedAnomalyRuleEvaluation extends TriggeredAnomalyRuleRevealEvaluationBase {
  readonly status: 'acknowledged'
  readonly ruleId: string
  readonly hiddenRuleRef: string
  readonly procedureRefs: readonly string[]
  readonly acknowledgementRequired: true
  readonly acknowledgementPrompt: string
}

export type TriggeredAnomalyRuleRevealEvaluation =
  HiddenAnomalyRuleEvaluation | RevealedAnomalyRuleEvaluation | AcknowledgedAnomalyRuleEvaluation

const MAGNITUDE_TIER_SET = new Set<string>(ANOMALY_INTERACTION_MAGNITUDE_TIERS)
const RESPONSE_SCALE_SET = new Set<string>(ANOMALY_RESPONSE_SCALES)
const MAGNITUDE_TIER_RANK = new Map<AnomalyInteractionMagnitudeTier, number>(
  ANOMALY_INTERACTION_MAGNITUDE_TIERS.map((tier, index) => [tier, index])
)

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isMagnitudeTier(value: unknown): value is AnomalyInteractionMagnitudeTier {
  return typeof value === 'string' && MAGNITUDE_TIER_SET.has(value)
}

function isResponseScale(value: unknown): value is AnomalyResponseScale {
  return typeof value === 'string' && RESPONSE_SCALE_SET.has(value)
}

function normalizeStringList(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${label} must be an array`)
  }
  return Object.freeze(value.map((entry, index) => assertNonEmptyId(entry, `${label}[${index}]`)))
}

function duplicateValues(values: readonly string[]): readonly string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value)
    }
    seen.add(value)
  }
  return [...duplicates].sort((left, right) => left.localeCompare(right))
}

interface ParsedRevealRecordValidationFields {
  readonly id: string
  readonly anomalyRef: string
  readonly hiddenRuleRef: string
  readonly trigger: Record<string, unknown> | undefined
  readonly actionRef: string
  readonly rawSetupRefs: readonly unknown[]
  readonly setupRefs: readonly string[]
  readonly rawProcedureRefs: readonly unknown[]
  readonly procedureRefs: readonly string[]
  readonly hasUntrimmedReference: boolean
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asUnknownArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : []
}

function parseRevealRecordValidationFields(
  record: TriggeredAnomalyRuleRevealRecord
): ParsedRevealRecordValidationFields {
  const rawId = asString(record?.id)
  const id = rawId.trim()
  const rawAnomalyRef = asString(record?.anomalyRef)
  const anomalyRef = rawAnomalyRef.trim()
  const rawHiddenRuleRef = asString(record?.hiddenRuleRef)
  const hiddenRuleRef = rawHiddenRuleRef.trim()
  const trigger = isObject(record?.trigger) ? record.trigger : undefined
  const rawActionRef = asString(trigger?.actionRef)
  const actionRef = rawActionRef.trim()
  const rawSetupRefs = asUnknownArray(trigger?.requiredSetupRefs)
  const setupRefs = rawSetupRefs.filter((value): value is string => typeof value === 'string')
  const rawProcedureRefs = asUnknownArray(record?.procedureRefs)
  const procedureRefs = rawProcedureRefs.filter(
    (value): value is string => typeof value === 'string'
  )
  const hasUntrimmedReference =
    (rawId.length > 0 && rawId !== id) ||
    (rawAnomalyRef.length > 0 && rawAnomalyRef !== anomalyRef) ||
    (rawHiddenRuleRef.length > 0 && rawHiddenRuleRef !== hiddenRuleRef) ||
    (rawActionRef.length > 0 && rawActionRef !== actionRef) ||
    setupRefs.some((value) => value !== value.trim()) ||
    procedureRefs.some((value) => value !== value.trim())

  return {
    id,
    anomalyRef,
    hiddenRuleRef,
    trigger,
    actionRef,
    rawSetupRefs,
    setupRefs,
    rawProcedureRefs,
    procedureRefs,
    hasUntrimmedReference,
  }
}

function addValidationIssue(
  issues: TriggeredAnomalyRuleRevealValidationIssue[],
  code: TriggeredAnomalyRuleRevealValidationCode,
  detail: string
): void {
  issues.push({ code, detail })
}

function validateRequiredRecordReferences(
  fields: ParsedRevealRecordValidationFields,
  issues: TriggeredAnomalyRuleRevealValidationIssue[]
): void {
  const { id } = fields
  if (!id) addValidationIssue(issues, 'missing_id', 'Rule reveal record is missing id.')
  if (!fields.anomalyRef) {
    addValidationIssue(
      issues,
      'missing_anomaly_ref',
      `Rule ${id || '(unknown)'} is missing anomalyRef.`
    )
  }
  if (!fields.hiddenRuleRef) {
    addValidationIssue(
      issues,
      'missing_hidden_rule_ref',
      `Rule ${id || '(unknown)'} is missing hiddenRuleRef.`
    )
  }
  if (!fields.actionRef || fields.trigger?.kind !== 'high_impact_action') {
    addValidationIssue(
      issues,
      'missing_action_ref',
      `Rule ${id || '(unknown)'} requires a high-impact actionRef.`
    )
  }
  if (fields.hasUntrimmedReference) {
    addValidationIssue(
      issues,
      'untrimmed_reference',
      `Rule ${id || '(unknown)'} contains an identifier or reference with surrounding whitespace.`
    )
  }
}

function validateSetupReferences(
  fields: ParsedRevealRecordValidationFields,
  issues: TriggeredAnomalyRuleRevealValidationIssue[]
): void {
  const { id, setupRefs, rawSetupRefs } = fields
  if (
    setupRefs.length === 0 ||
    setupRefs.length !== rawSetupRefs.length ||
    setupRefs.some((value) => !value.trim())
  ) {
    addValidationIssue(
      issues,
      'missing_setup_ref',
      `Rule ${id || '(unknown)'} requires at least one non-empty setup ref.`
    )
  }
  if (duplicateValues(setupRefs.map((value) => value.trim())).length > 0) {
    addValidationIssue(
      issues,
      'duplicate_setup_ref',
      `Rule ${id || '(unknown)'} has duplicate setup refs.`
    )
  }
}

function validateProcedureReferences(
  fields: ParsedRevealRecordValidationFields,
  issues: TriggeredAnomalyRuleRevealValidationIssue[]
): void {
  const { id, procedureRefs, rawProcedureRefs } = fields
  if (
    procedureRefs.length === 0 ||
    procedureRefs.length !== rawProcedureRefs.length ||
    procedureRefs.some((value) => !value.trim())
  ) {
    addValidationIssue(
      issues,
      'missing_procedure_ref',
      `Rule ${id || '(unknown)'} requires at least one non-empty procedure ref.`
    )
  }
  if (duplicateValues(procedureRefs.map((value) => value.trim())).length > 0) {
    addValidationIssue(
      issues,
      'duplicate_procedure_ref',
      `Rule ${id || '(unknown)'} has duplicate procedure refs.`
    )
  }
}

function validateMagnitudeAndResponseScale(
  record: TriggeredAnomalyRuleRevealRecord,
  fields: ParsedRevealRecordValidationFields,
  issues: TriggeredAnomalyRuleRevealValidationIssue[]
): void {
  const { id } = fields
  if (!isMagnitudeTier(fields.trigger?.minimumMagnitudeTier)) {
    addValidationIssue(
      issues,
      'invalid_magnitude_tier',
      `Rule ${id || '(unknown)'} has invalid minimumMagnitudeTier.`
    )
  }
  if (!isResponseScale(record?.responseScaleBeforeReveal)) {
    addValidationIssue(
      issues,
      'invalid_response_scale',
      `Rule ${id || '(unknown)'} has invalid responseScaleBeforeReveal.`
    )
  }
  if (!isResponseScale(record?.responseScaleAfterReveal)) {
    addValidationIssue(
      issues,
      'invalid_response_scale',
      `Rule ${id || '(unknown)'} has invalid responseScaleAfterReveal.`
    )
  }
  if (
    isResponseScale(record?.responseScaleBeforeReveal) &&
    record.responseScaleBeforeReveal === record.responseScaleAfterReveal
  ) {
    addValidationIssue(
      issues,
      'unchanged_response_scale',
      `Rule ${id || '(unknown)'} must change allowed response scale after reveal.`
    )
  }
}

function validateAcknowledgementRequirement(
  record: TriggeredAnomalyRuleRevealRecord,
  id: string,
  issues: TriggeredAnomalyRuleRevealValidationIssue[]
): void {
  if (typeof record?.acknowledgementRequired !== 'boolean') {
    addValidationIssue(
      issues,
      'invalid_acknowledgement_requirement',
      `Rule ${id || '(unknown)'} must declare whether acknowledgement is required.`
    )
  }
  if (
    record?.acknowledgementRequired &&
    (typeof record.acknowledgementPrompt !== 'string' || !record.acknowledgementPrompt.trim())
  ) {
    addValidationIssue(
      issues,
      'missing_acknowledgement_prompt',
      `Rule ${id || '(unknown)'} requires an acknowledgement prompt.`
    )
  }
}

export function validateTriggeredAnomalyRuleRevealRecord(
  record: TriggeredAnomalyRuleRevealRecord
): TriggeredAnomalyRuleRevealValidationResult {
  const issues: TriggeredAnomalyRuleRevealValidationIssue[] = []
  const fields = parseRevealRecordValidationFields(record)
  validateRequiredRecordReferences(fields, issues)
  validateSetupReferences(fields, issues)
  validateProcedureReferences(fields, issues)
  validateMagnitudeAndResponseScale(record, fields, issues)
  validateAcknowledgementRequirement(record, fields.id, issues)

  return Object.freeze({ valid: issues.length === 0, issues: Object.freeze(issues) })
}

export function validateTriggeredAnomalyRuleRevealRegistry(
  registry: TriggeredAnomalyRuleRevealRegistry
): TriggeredAnomalyRuleRevealValidationResult {
  const issues: TriggeredAnomalyRuleRevealValidationIssue[] = []
  const seenIds = new Set<string>()
  for (const entry of registry.entries) {
    issues.push(...validateTriggeredAnomalyRuleRevealRecord(entry).issues)
    const id = typeof entry.id === 'string' ? entry.id.trim() : ''
    if (!id) continue
    if (seenIds.has(id)) {
      issues.push({ code: 'duplicate_id', detail: `Duplicate rule reveal id ${id}.` })
    }
    seenIds.add(id)
  }
  return Object.freeze({ valid: issues.length === 0, issues: Object.freeze(issues) })
}

function hiddenEvaluation(
  record: TriggeredAnomalyRuleRevealRecord,
  reason: HiddenAnomalyRuleEvaluation['reason'],
  canProceed: boolean,
  missingSetupRefs: readonly string[]
): HiddenAnomalyRuleEvaluation {
  return Object.freeze({
    status: 'hidden',
    reason,
    canProceed,
    allowedResponseScale: record.responseScaleBeforeReveal,
    missingSetupRefs: Object.freeze([...missingSetupRefs]),
    owner: TRIGGERED_ANOMALY_RULE_REVEAL_OWNER,
    magnitudeOwner: ANOMALY_INTERACTION_PACKAGE_OWNER,
  })
}

function requireAcknowledgementPrompt(record: TriggeredAnomalyRuleRevealRecord): string {
  const prompt = record.acknowledgementPrompt
  if (typeof prompt !== 'string' || !prompt.trim()) {
    throw new TypeError('acknowledgementPrompt is required when acknowledgementRequired is true')
  }
  return prompt
}

/** Evaluate one caller-owned action without mutating rule, setup, or acknowledgement state. */
export function evaluateTriggeredAnomalyRuleReveal(
  record: TriggeredAnomalyRuleRevealRecord,
  input: TriggeredAnomalyRuleRevealEvaluationInput
): TriggeredAnomalyRuleRevealEvaluation {
  const validation = validateTriggeredAnomalyRuleRevealRecord(record)
  if (!validation.valid) {
    throw new Error(
      `invalid rule reveal record: ${validation.issues.map((issue) => issue.code).join(', ')}`
    )
  }
  if (!isObject(input)) throw new Error('rule reveal evaluation input is required')

  const anomalyRef = assertNonEmptyId(input.anomalyRef, 'anomalyRef')
  const actionRef = assertNonEmptyId(input.actionRef, 'actionRef')
  const completedSetupRefs = normalizeStringList(input.completedSetupRefs, 'completedSetupRefs')
  const acknowledgedRuleIds = normalizeStringList(input.acknowledgedRuleIds, 'acknowledgedRuleIds')
  if (!isMagnitudeTier(input.magnitudeTier)) throw new Error('magnitudeTier is invalid')

  if (anomalyRef !== record.anomalyRef) {
    return hiddenEvaluation(record, 'anomaly_not_applicable', true, [])
  }
  if (actionRef !== record.trigger.actionRef) {
    return hiddenEvaluation(record, 'action_not_applicable', true, [])
  }

  const completedSetupSet = new Set(completedSetupRefs)
  const missingSetupRefs = record.trigger.requiredSetupRefs.filter(
    (setupRef) => !completedSetupSet.has(setupRef)
  )
  if (missingSetupRefs.length > 0) {
    return hiddenEvaluation(record, 'setup_incomplete', false, missingSetupRefs)
  }

  const magnitudeRank = MAGNITUDE_TIER_RANK.get(input.magnitudeTier)!
  const minimumRank = MAGNITUDE_TIER_RANK.get(record.trigger.minimumMagnitudeTier)!
  if (magnitudeRank < minimumRank) {
    return hiddenEvaluation(record, 'magnitude_below_trigger', true, [])
  }

  const acknowledged = acknowledgedRuleIds.includes(record.id)
  if (record.acknowledgementRequired && acknowledged) {
    return Object.freeze({
      ruleId: record.id,
      status: 'acknowledged',
      reason: 'acknowledged',
      canProceed: true,
      allowedResponseScale: record.responseScaleAfterReveal,
      missingSetupRefs: Object.freeze([]),
      hiddenRuleRef: record.hiddenRuleRef,
      procedureRefs: Object.freeze([...record.procedureRefs]),
      acknowledgementRequired: true,
      acknowledgementPrompt: requireAcknowledgementPrompt(record),
      owner: TRIGGERED_ANOMALY_RULE_REVEAL_OWNER,
      magnitudeOwner: ANOMALY_INTERACTION_PACKAGE_OWNER,
    })
  }

  return Object.freeze({
    ruleId: record.id,
    status: 'revealed',
    reason: record.acknowledgementRequired ? 'acknowledgement_required' : 'revealed',
    canProceed: !record.acknowledgementRequired,
    allowedResponseScale: record.responseScaleAfterReveal,
    missingSetupRefs: Object.freeze([]),
    hiddenRuleRef: record.hiddenRuleRef,
    procedureRefs: Object.freeze([...record.procedureRefs]),
    acknowledgementRequired: record.acknowledgementRequired,
    ...(record.acknowledgementPrompt
      ? { acknowledgementPrompt: record.acknowledgementPrompt }
      : {}),
    owner: TRIGGERED_ANOMALY_RULE_REVEAL_OWNER,
    magnitudeOwner: ANOMALY_INTERACTION_PACKAGE_OWNER,
  })
}

function defineRule(input: TriggeredAnomalyRuleRevealRecord): TriggeredAnomalyRuleRevealRecord {
  return Object.freeze({
    ...input,
    procedureRefs: Object.freeze([...input.procedureRefs]),
    trigger: Object.freeze({
      ...input.trigger,
      requiredSetupRefs: Object.freeze([...input.trigger.requiredSetupRefs]),
    }),
  })
}

export const DEFAULT_TRIGGERED_ANOMALY_RULE_REVEAL_REGISTRY: TriggeredAnomalyRuleRevealRegistry =
  Object.freeze({
    entries: Object.freeze([
      defineRule({
        id: 'rule-reveal:resonant-lattice-overload',
        anomalyRef: 'anomaly:resonant-lattice',
        hiddenRuleRef: 'anomaly-rule:resonant-lattice:overload-feedback',
        procedureRefs: [
          'procedure:resonant-lattice:distributed-grounding',
          'procedure:resonant-lattice:evacuation-perimeter',
        ],
        trigger: {
          kind: 'high_impact_action',
          actionRef: 'action:resonant-lattice:amplify-containment-field',
          requiredSetupRefs: [
            'setup:resonant-lattice:grounding-grid-online',
            'setup:resonant-lattice:remote-cutoff-staffed',
          ],
          minimumMagnitudeTier: 'site',
        },
        acknowledgementRequired: true,
        acknowledgementPrompt:
          'Acknowledge overload-feedback procedure and site-wide response authority before amplification.',
        responseScaleBeforeReveal: 'specialist',
        responseScaleAfterReveal: 'site_wide',
      }),
    ]),
  })
