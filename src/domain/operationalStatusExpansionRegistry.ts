/**
 * SPE-2166 slice 1: operational status expansion registry.
 *
 * This pure registry represents cross-domain operational statuses without
 * resolving stacking, duration, removal, persistence, or runtime effects.
 */

import { isEffectDurationModeId, type EffectDurationModeId } from './effectDurationModeRegistry'

export const OPERATIONAL_STATUS_EXPANSION_OWNER = 'SPE-2166' as const
export const STATUS_EFFECT_REGISTRY_OWNER = 'SPE-1365' as const
export const EFFECT_STACK_POLICY_OWNER = 'SPE-780' as const
export const EFFECT_DURATION_MODE_OWNER = 'SPE-2191' as const
export const TRIGGER_COUNTED_DURATION_OWNER = 'SPE-1369' as const

export type OperationalStatusDomain =
  'physical' | 'cognitive' | 'emotional' | 'legal' | 'financial' | 'social' | 'memory'

export const OPERATIONAL_STATUS_DOMAINS: readonly OperationalStatusDomain[] = Object.freeze([
  'physical',
  'cognitive',
  'emotional',
  'legal',
  'financial',
  'social',
  'memory',
])

export type OperationalStatusSeverityTier = 'advisory' | 'constrained' | 'severe' | 'critical'

export const OPERATIONAL_STATUS_SEVERITY_TIERS: readonly OperationalStatusSeverityTier[] =
  Object.freeze(['advisory', 'constrained', 'severe', 'critical'])

export type EffectStackPolicyRef =
  | 'stack-policy:replace'
  | 'stack-policy:highest-severity'
  | 'stack-policy:bounded-additive'
  | 'stack-policy:independent-instances'

export const EFFECT_STACK_POLICY_REFS: readonly EffectStackPolicyRef[] = Object.freeze([
  'stack-policy:replace',
  'stack-policy:highest-severity',
  'stack-policy:bounded-additive',
  'stack-policy:independent-instances',
])

export interface OperationalStatusStackPolicyReference {
  readonly policyRef: EffectStackPolicyRef
  readonly maxInstances?: number
}

export type OperationalStatusVisibility = 'private' | 'restricted' | 'team' | 'public_record'

export const OPERATIONAL_STATUS_VISIBILITIES: readonly OperationalStatusVisibility[] =
  Object.freeze(['private', 'restricted', 'team', 'public_record'])

export type OperationalStatusLabelTone = 'neutral' | 'supportive' | 'procedural'

export interface CareAwareStatusLabel {
  readonly displayLabel: string
  readonly tone: OperationalStatusLabelTone
  readonly personFirst: true
  readonly careReviewed: true
}

export type OperationalStatusReportingCategory =
  'wellbeing' | 'capacity' | 'compliance' | 'resource' | 'relationship' | 'knowledge_integrity'

export const OPERATIONAL_STATUS_REPORTING_CATEGORIES: readonly OperationalStatusReportingCategory[] =
  Object.freeze([
    'wellbeing',
    'capacity',
    'compliance',
    'resource',
    'relationship',
    'knowledge_integrity',
  ])

export interface OperationalStatusOwnerReferences {
  readonly statusRegistryOwner: typeof STATUS_EFFECT_REGISTRY_OWNER
  readonly stackPolicyOwner: typeof EFFECT_STACK_POLICY_OWNER
  readonly durationModeOwner: typeof EFFECT_DURATION_MODE_OWNER
  readonly triggerCountedDurationOwner: typeof TRIGGER_COUNTED_DURATION_OWNER
}

export interface OperationalStatusRecord {
  readonly id: string
  readonly domain: OperationalStatusDomain
  readonly severityTier: OperationalStatusSeverityTier
  readonly stackPolicy: OperationalStatusStackPolicyReference
  readonly durationModeRef: EffectDurationModeId
  readonly visibility: OperationalStatusVisibility
  readonly removalPathRef: string
  readonly label: CareAwareStatusLabel
  readonly reportingCategory: OperationalStatusReportingCategory
  readonly owners: OperationalStatusOwnerReferences
}

export interface OperationalStatusExpansionRegistry {
  readonly entries: readonly OperationalStatusRecord[]
}

export interface OperationalStatusProjection {
  readonly id: string
  readonly domain: OperationalStatusDomain
  readonly severityTier: OperationalStatusSeverityTier
  readonly displayLabel: string
  readonly stackPolicyRef: EffectStackPolicyRef
  readonly stackMaxInstances: number | null
  readonly durationModeRef: EffectDurationModeId
  readonly visibility: OperationalStatusVisibility
  readonly removalPathRef: string
  readonly reportingCategory: OperationalStatusReportingCategory
  readonly owner: typeof OPERATIONAL_STATUS_EXPANSION_OWNER
  readonly statusRegistryOwner: typeof STATUS_EFFECT_REGISTRY_OWNER
  readonly stackPolicyOwner: typeof EFFECT_STACK_POLICY_OWNER
  readonly durationModeOwner: typeof EFFECT_DURATION_MODE_OWNER
  readonly triggerCountedDurationOwner: typeof TRIGGER_COUNTED_DURATION_OWNER
}

export type OperationalStatusValidationCode =
  | 'invalid_record'
  | 'invalid_registry'
  | 'missing_id'
  | 'untrimmed_reference'
  | 'duplicate_id'
  | 'invalid_domain'
  | 'invalid_severity_tier'
  | 'invalid_stack_policy_ref'
  | 'contradictory_stack_policy'
  | 'invalid_duration_mode_ref'
  | 'invalid_visibility'
  | 'missing_removal_path_ref'
  | 'invalid_removal_path_ref'
  | 'missing_label'
  | 'unsafe_label_metadata'
  | 'invalid_reporting_category'
  | 'invalid_owner_references'

export interface OperationalStatusValidationIssue {
  readonly code: OperationalStatusValidationCode
  readonly detail: string
}

export interface OperationalStatusValidationResult {
  readonly valid: boolean
  readonly issues: readonly OperationalStatusValidationIssue[]
}

const DOMAIN_SET = new Set<string>(OPERATIONAL_STATUS_DOMAINS)
const SEVERITY_TIER_SET = new Set<string>(OPERATIONAL_STATUS_SEVERITY_TIERS)
const STACK_POLICY_REF_SET = new Set<string>(EFFECT_STACK_POLICY_REFS)
const VISIBILITY_SET = new Set<string>(OPERATIONAL_STATUS_VISIBILITIES)
const LABEL_TONE_SET = new Set<string>(['neutral', 'supportive', 'procedural'])
const REPORTING_CATEGORY_SET = new Set<string>(OPERATIONAL_STATUS_REPORTING_CATEGORIES)
const BOUNDED_STACK_POLICY_REFS = new Set<EffectStackPolicyRef>([
  'stack-policy:bounded-additive',
  'stack-policy:independent-instances',
])
const REMOVAL_PATH_REF_PATTERN = /^removal-path:[a-z0-9]+(?:-[a-z0-9]+)*$/

export const OPERATIONAL_STATUS_OWNER_REFERENCES: OperationalStatusOwnerReferences = Object.freeze({
  statusRegistryOwner: STATUS_EFFECT_REGISTRY_OWNER,
  stackPolicyOwner: EFFECT_STACK_POLICY_OWNER,
  durationModeOwner: EFFECT_DURATION_MODE_OWNER,
  triggerCountedDurationOwner: TRIGGER_COUNTED_DURATION_OWNER,
})

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function addIssue(
  issues: OperationalStatusValidationIssue[],
  code: OperationalStatusValidationCode,
  detail: string
): void {
  issues.push({ code, detail })
}

function validateId(
  raw: Record<string, unknown>,
  issues: OperationalStatusValidationIssue[]
): string {
  if (typeof raw.id !== 'string' || !raw.id.trim()) {
    addIssue(issues, 'missing_id', 'Operational status id is required.')
    return ''
  }
  if (raw.id !== raw.id.trim()) {
    addIssue(issues, 'untrimmed_reference', `Operational status id ${raw.id} must be trimmed.`)
  }
  return raw.id.trim()
}

function validateDomainAndSeverity(
  raw: Record<string, unknown>,
  id: string,
  issues: OperationalStatusValidationIssue[]
): void {
  if (typeof raw.domain !== 'string' || !DOMAIN_SET.has(raw.domain)) {
    addIssue(
      issues,
      'invalid_domain',
      `Operational status ${id || '(unknown)'} has an invalid domain.`
    )
  }
  if (typeof raw.severityTier !== 'string' || !SEVERITY_TIER_SET.has(raw.severityTier)) {
    addIssue(
      issues,
      'invalid_severity_tier',
      `Operational status ${id || '(unknown)'} has an invalid severity tier.`
    )
  }
}

function validateStackPolicy(
  value: unknown,
  id: string,
  issues: OperationalStatusValidationIssue[]
): void {
  if (
    !isObject(value) ||
    typeof value.policyRef !== 'string' ||
    !STACK_POLICY_REF_SET.has(value.policyRef)
  ) {
    addIssue(
      issues,
      'invalid_stack_policy_ref',
      `Operational status ${id || '(unknown)'} has an invalid stack-policy reference.`
    )
    return
  }

  const policyRef = value.policyRef as EffectStackPolicyRef
  const requiresBound = BOUNDED_STACK_POLICY_REFS.has(policyRef)
  const hasValidBound = Number.isInteger(value.maxInstances) && Number(value.maxInstances) >= 2
  const hasAnyBound = value.maxInstances !== undefined
  if ((requiresBound && !hasValidBound) || (!requiresBound && hasAnyBound)) {
    addIssue(
      issues,
      'contradictory_stack_policy',
      `Operational status ${id || '(unknown)'} has stack-policy fields that contradict ${policyRef}.`
    )
  }
}

function validateDurationAndVisibility(
  raw: Record<string, unknown>,
  id: string,
  issues: OperationalStatusValidationIssue[]
): void {
  if (typeof raw.durationModeRef !== 'string' || !isEffectDurationModeId(raw.durationModeRef)) {
    addIssue(
      issues,
      'invalid_duration_mode_ref',
      `Operational status ${id || '(unknown)'} must reference an SPE-2191 duration mode.`
    )
  }
  if (typeof raw.visibility !== 'string' || !VISIBILITY_SET.has(raw.visibility)) {
    addIssue(
      issues,
      'invalid_visibility',
      `Operational status ${id || '(unknown)'} has an invalid visibility.`
    )
  }
}

function validateRemovalPath(
  value: unknown,
  id: string,
  issues: OperationalStatusValidationIssue[]
): void {
  if (typeof value !== 'string' || !value.trim()) {
    addIssue(
      issues,
      'missing_removal_path_ref',
      `Operational status ${id || '(unknown)'} requires a removal-path reference.`
    )
    return
  }
  if (value !== value.trim()) {
    addIssue(
      issues,
      'untrimmed_reference',
      `Operational status ${id || '(unknown)'} removal-path reference must be trimmed.`
    )
  }
  if (!REMOVAL_PATH_REF_PATTERN.test(value.trim())) {
    addIssue(
      issues,
      'invalid_removal_path_ref',
      `Operational status ${id || '(unknown)'} removal path must use the removal-path namespace.`
    )
  }
}

function validateLabel(
  value: unknown,
  id: string,
  issues: OperationalStatusValidationIssue[]
): void {
  if (!isObject(value) || typeof value.displayLabel !== 'string' || !value.displayLabel.trim()) {
    addIssue(issues, 'missing_label', `Operational status ${id || '(unknown)'} requires a label.`)
    return
  }
  const safeMetadata =
    typeof value.tone === 'string' &&
    LABEL_TONE_SET.has(value.tone) &&
    value.personFirst === true &&
    value.careReviewed === true
  if (!safeMetadata || value.displayLabel !== value.displayLabel.trim()) {
    addIssue(
      issues,
      'unsafe_label_metadata',
      `Operational status ${id || '(unknown)'} requires reviewed, person-first label metadata.`
    )
  }
}

function validateReportingAndOwners(
  raw: Record<string, unknown>,
  id: string,
  issues: OperationalStatusValidationIssue[]
): void {
  if (
    typeof raw.reportingCategory !== 'string' ||
    !REPORTING_CATEGORY_SET.has(raw.reportingCategory)
  ) {
    addIssue(
      issues,
      'invalid_reporting_category',
      `Operational status ${id || '(unknown)'} has an invalid reporting category.`
    )
  }

  const owners = raw.owners
  if (
    !isObject(owners) ||
    owners.statusRegistryOwner !== STATUS_EFFECT_REGISTRY_OWNER ||
    owners.stackPolicyOwner !== EFFECT_STACK_POLICY_OWNER ||
    owners.durationModeOwner !== EFFECT_DURATION_MODE_OWNER ||
    owners.triggerCountedDurationOwner !== TRIGGER_COUNTED_DURATION_OWNER
  ) {
    addIssue(
      issues,
      'invalid_owner_references',
      `Operational status ${id || '(unknown)'} must preserve status, stacking, and duration ownership.`
    )
  }
}

export function validateOperationalStatusRecord(
  record: OperationalStatusRecord
): OperationalStatusValidationResult {
  if (!isObject(record)) {
    return {
      valid: false,
      issues: [{ code: 'invalid_record', detail: 'Operational status record is required.' }],
    }
  }

  const issues: OperationalStatusValidationIssue[] = []
  const id = validateId(record, issues)
  validateDomainAndSeverity(record, id, issues)
  validateStackPolicy(record.stackPolicy, id, issues)
  validateDurationAndVisibility(record, id, issues)
  validateRemovalPath(record.removalPathRef, id, issues)
  validateLabel(record.label, id, issues)
  validateReportingAndOwners(record, id, issues)

  return { valid: issues.length === 0, issues: Object.freeze(issues) }
}

export function validateOperationalStatusExpansionRegistry(
  registry: OperationalStatusExpansionRegistry
): OperationalStatusValidationResult {
  if (!isObject(registry) || !Array.isArray(registry.entries)) {
    return {
      valid: false,
      issues: [
        { code: 'invalid_registry', detail: 'Operational status registry entries are required.' },
      ],
    }
  }

  const issues: OperationalStatusValidationIssue[] = []
  const seenIds = new Set<string>()
  for (const entry of registry.entries) {
    issues.push(...validateOperationalStatusRecord(entry).issues)
    if (typeof entry?.id !== 'string' || !entry.id.trim()) continue
    const id = entry.id.trim()
    if (seenIds.has(id)) {
      addIssue(issues, 'duplicate_id', `Operational status registry contains duplicate id ${id}.`)
    }
    seenIds.add(id)
  }
  return { valid: issues.length === 0, issues: Object.freeze(issues) }
}

function assertValidRecord(record: OperationalStatusRecord): void {
  const validation = validateOperationalStatusRecord(record)
  if (!validation.valid) {
    throw new Error(
      `invalid operational status record: ${validation.issues.map((issue) => issue.code).join(', ')}`
    )
  }
}

export function projectOperationalStatusRecord(
  record: OperationalStatusRecord
): OperationalStatusProjection {
  assertValidRecord(record)
  return Object.freeze({
    id: record.id,
    domain: record.domain,
    severityTier: record.severityTier,
    displayLabel: record.label.displayLabel,
    stackPolicyRef: record.stackPolicy.policyRef,
    stackMaxInstances: record.stackPolicy.maxInstances ?? null,
    durationModeRef: record.durationModeRef,
    visibility: record.visibility,
    removalPathRef: record.removalPathRef,
    reportingCategory: record.reportingCategory,
    owner: OPERATIONAL_STATUS_EXPANSION_OWNER,
    statusRegistryOwner: record.owners.statusRegistryOwner,
    stackPolicyOwner: record.owners.stackPolicyOwner,
    durationModeOwner: record.owners.durationModeOwner,
    triggerCountedDurationOwner: record.owners.triggerCountedDurationOwner,
  })
}

export function projectOperationalStatusExpansionRegistry(
  registry: OperationalStatusExpansionRegistry
): readonly OperationalStatusProjection[] {
  const validation = validateOperationalStatusExpansionRegistry(registry)
  if (!validation.valid) {
    throw new Error(
      `invalid operational status registry: ${validation.issues.map((issue) => issue.code).join(', ')}`
    )
  }
  return Object.freeze(registry.entries.map((entry) => projectOperationalStatusRecord(entry)))
}

function defineStatus(input: OperationalStatusRecord): OperationalStatusRecord {
  return Object.freeze({
    ...input,
    stackPolicy: Object.freeze({ ...input.stackPolicy }),
    label: Object.freeze({ ...input.label }),
    owners: OPERATIONAL_STATUS_OWNER_REFERENCES,
  })
}

function reviewedLabel(
  displayLabel: string,
  tone: OperationalStatusLabelTone
): CareAwareStatusLabel {
  return Object.freeze({ displayLabel, tone, personFirst: true, careReviewed: true })
}

export const DEFAULT_OPERATIONAL_STATUS_EXPANSION_REGISTRY: OperationalStatusExpansionRegistry =
  Object.freeze({
    entries: Object.freeze([
      defineStatus({
        id: 'operational-status:physical:mobility-support-needed',
        domain: 'physical',
        severityTier: 'constrained',
        stackPolicy: { policyRef: 'stack-policy:highest-severity' },
        durationModeRef: 'timed',
        visibility: 'restricted',
        removalPathRef: 'removal-path:care-plan-review',
        label: reviewedLabel('Mobility support needed', 'supportive'),
        reportingCategory: 'wellbeing',
        owners: OPERATIONAL_STATUS_OWNER_REFERENCES,
      }),
      defineStatus({
        id: 'operational-status:cognitive:attention-bandwidth-limited',
        domain: 'cognitive',
        severityTier: 'advisory',
        stackPolicy: { policyRef: 'stack-policy:replace' },
        durationModeRef: 'timed',
        visibility: 'private',
        removalPathRef: 'removal-path:capacity-reassessment',
        label: reviewedLabel('Attention bandwidth limited', 'neutral'),
        reportingCategory: 'capacity',
        owners: OPERATIONAL_STATUS_OWNER_REFERENCES,
      }),
      defineStatus({
        id: 'operational-status:emotional:recovery-support-requested',
        domain: 'emotional',
        severityTier: 'advisory',
        stackPolicy: { policyRef: 'stack-policy:replace' },
        durationModeRef: 'timed',
        visibility: 'private',
        removalPathRef: 'removal-path:care-plan-review',
        label: reviewedLabel('Recovery support requested', 'supportive'),
        reportingCategory: 'wellbeing',
        owners: OPERATIONAL_STATUS_OWNER_REFERENCES,
      }),
      defineStatus({
        id: 'operational-status:legal:access-authorization-under-review',
        domain: 'legal',
        severityTier: 'constrained',
        stackPolicy: { policyRef: 'stack-policy:replace' },
        durationModeRef: 'dismiss_only',
        visibility: 'restricted',
        removalPathRef: 'removal-path:administrative-clearance',
        label: reviewedLabel('Access authorization under review', 'procedural'),
        reportingCategory: 'compliance',
        owners: OPERATIONAL_STATUS_OWNER_REFERENCES,
      }),
      defineStatus({
        id: 'operational-status:financial:disbursement-temporarily-held',
        domain: 'financial',
        severityTier: 'constrained',
        stackPolicy: {
          policyRef: 'stack-policy:independent-instances',
          maxInstances: 3,
        },
        durationModeRef: 'dismiss_only',
        visibility: 'restricted',
        removalPathRef: 'removal-path:account-review',
        label: reviewedLabel('Disbursement temporarily held', 'procedural'),
        reportingCategory: 'resource',
        owners: OPERATIONAL_STATUS_OWNER_REFERENCES,
      }),
      defineStatus({
        id: 'operational-status:social:liaison-trust-strained',
        domain: 'social',
        severityTier: 'constrained',
        stackPolicy: { policyRef: 'stack-policy:highest-severity' },
        durationModeRef: 'timed',
        visibility: 'team',
        removalPathRef: 'removal-path:relationship-reconciliation',
        label: reviewedLabel('Liaison trust strained', 'neutral'),
        reportingCategory: 'relationship',
        owners: OPERATIONAL_STATUS_OWNER_REFERENCES,
      }),
      defineStatus({
        id: 'operational-status:memory:recall-confidence-reduced',
        domain: 'memory',
        severityTier: 'advisory',
        stackPolicy: {
          policyRef: 'stack-policy:bounded-additive',
          maxInstances: 3,
        },
        durationModeRef: 'timed',
        visibility: 'private',
        removalPathRef: 'removal-path:memory-review',
        label: reviewedLabel('Recall confidence reduced', 'supportive'),
        reportingCategory: 'knowledge_integrity',
        owners: OPERATIONAL_STATUS_OWNER_REFERENCES,
      }),
    ]),
  })
