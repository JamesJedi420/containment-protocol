/**
 * SPE-2254 slice 1: deterministic effect duration-mode registry.
 */

export type EffectDurationModeId = 'maintained' | 'timed' | 'continual' | 'dismiss_only'

export const EFFECT_DURATION_MODE_IDS: readonly EffectDurationModeId[] = [
  'maintained',
  'timed',
  'continual',
  'dismiss_only',
] as const

export type EffectFocusRequirement = 'none' | 'focus_optional' | 'focus_required'
export type EffectUpkeepRequirement = 'none' | 'periodic_check' | 'continuous_attention'
export type EffectExpiryBasis = 'none' | 'timer' | 'condition'
export type EffectDismissalRule = 'not_dismissible' | 'manual' | 'dispel' | 'condition'
export type EffectInterruptionBehavior = 'none' | 'suspend' | 'end'

export interface EffectDurationModeRecord {
  readonly id: EffectDurationModeId
  readonly label: string
  readonly focusRequirement: EffectFocusRequirement
  readonly upkeepRequirement: EffectUpkeepRequirement
  readonly expiryBasis: EffectExpiryBasis
  readonly dismissalRule: EffectDismissalRule
  readonly interruptionBehavior: EffectInterruptionBehavior
  readonly reportingLabel: string
  readonly summary?: string
}

export interface EffectDurationModeRegistry {
  readonly entries: readonly EffectDurationModeRecord[]
}

export interface EffectDurationModeProjection {
  readonly id: EffectDurationModeId
  readonly label: string
  readonly requiresActiveUpkeep: boolean
  readonly hasTimerExpiry: boolean
  readonly allowsDismissal: boolean
  readonly reportingLabel: string
}

export type EffectDurationModeValidationCode =
  | 'missing_id'
  | 'duplicate_id'
  | 'missing_label'
  | 'invalid_id'
  | 'invalid_focus_requirement'
  | 'invalid_upkeep_requirement'
  | 'invalid_expiry_basis'
  | 'invalid_dismissal_rule'
  | 'invalid_interruption_behavior'
  | 'missing_reporting_label'
  | 'maintained_without_upkeep_or_focus'
  | 'dismiss_only_with_timer_expiry'

export interface EffectDurationModeValidationIssue {
  readonly code: EffectDurationModeValidationCode
  readonly detail: string
  readonly relatedIds?: readonly string[]
}

export interface EffectDurationModeValidationResult {
  readonly valid: boolean
  readonly issues: readonly EffectDurationModeValidationIssue[]
}

const MODE_ID_SET = new Set<string>(EFFECT_DURATION_MODE_IDS)
const FOCUS_REQUIREMENT_SET = new Set<EffectFocusRequirement>([
  'none',
  'focus_optional',
  'focus_required',
])
const UPKEEP_REQUIREMENT_SET = new Set<EffectUpkeepRequirement>([
  'none',
  'periodic_check',
  'continuous_attention',
])
const EXPIRY_BASIS_SET = new Set<EffectExpiryBasis>(['none', 'timer', 'condition'])
const DISMISSAL_RULE_SET = new Set<EffectDismissalRule>([
  'not_dismissible',
  'manual',
  'dispel',
  'condition',
])
const INTERRUPTION_BEHAVIOR_SET = new Set<EffectInterruptionBehavior>(['none', 'suspend', 'end'])

function normalizeToken(value: string) {
  return value.trim()
}

function pushIssue(
  issues: EffectDurationModeValidationIssue[],
  issue: EffectDurationModeValidationIssue
) {
  issues.push(issue)
}

export function isEffectDurationModeId(value: string): value is EffectDurationModeId {
  return MODE_ID_SET.has(value)
}

export function validateEffectDurationModeRecord(
  record: EffectDurationModeRecord
): EffectDurationModeValidationResult {
  const issues: EffectDurationModeValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)
  const reportingLabel = normalizeToken(record.reportingLabel)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      detail: 'Duration-mode record is missing id.',
    })
  } else if (!isEffectDurationModeId(id)) {
    pushIssue(issues, {
      code: 'invalid_id',
      detail: `Duration-mode record has invalid id ${id}.`,
      relatedIds: [id],
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      detail: `Duration-mode ${id || '(unknown)'} is missing label.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!FOCUS_REQUIREMENT_SET.has(record.focusRequirement)) {
    pushIssue(issues, {
      code: 'invalid_focus_requirement',
      detail: `Duration-mode ${id || '(unknown)'} has invalid focus requirement ${String(record.focusRequirement)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!UPKEEP_REQUIREMENT_SET.has(record.upkeepRequirement)) {
    pushIssue(issues, {
      code: 'invalid_upkeep_requirement',
      detail: `Duration-mode ${id || '(unknown)'} has invalid upkeep requirement ${String(record.upkeepRequirement)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!EXPIRY_BASIS_SET.has(record.expiryBasis)) {
    pushIssue(issues, {
      code: 'invalid_expiry_basis',
      detail: `Duration-mode ${id || '(unknown)'} has invalid expiry basis ${String(record.expiryBasis)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!DISMISSAL_RULE_SET.has(record.dismissalRule)) {
    pushIssue(issues, {
      code: 'invalid_dismissal_rule',
      detail: `Duration-mode ${id || '(unknown)'} has invalid dismissal rule ${String(record.dismissalRule)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!INTERRUPTION_BEHAVIOR_SET.has(record.interruptionBehavior)) {
    pushIssue(issues, {
      code: 'invalid_interruption_behavior',
      detail: `Duration-mode ${id || '(unknown)'} has invalid interruption behavior ${String(record.interruptionBehavior)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!reportingLabel) {
    pushIssue(issues, {
      code: 'missing_reporting_label',
      detail: `Duration-mode ${id || '(unknown)'} is missing reportingLabel.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    id === 'maintained' &&
    record.focusRequirement === 'none' &&
    record.upkeepRequirement === 'none'
  ) {
    pushIssue(issues, {
      code: 'maintained_without_upkeep_or_focus',
      detail:
        'Maintained duration mode must require focus and/or upkeep checks to distinguish active upkeep from passive continuation.',
      relatedIds: [id],
    })
  }

  if (id === 'dismiss_only' && record.expiryBasis === 'timer') {
    pushIssue(issues, {
      code: 'dismiss_only_with_timer_expiry',
      detail: 'Dismiss-only duration mode cannot require timer-only expiry.',
      relatedIds: [id],
    })
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

export function validateEffectDurationModeRegistry(
  registry: EffectDurationModeRegistry
): EffectDurationModeValidationResult {
  const issues: EffectDurationModeValidationIssue[] = []
  const seenIds = new Set<string>()

  for (const entry of registry.entries) {
    const entryResult = validateEffectDurationModeRecord(entry)
    issues.push(...entryResult.issues)

    const id = normalizeToken(entry.id)
    if (!id) {
      continue
    }

    if (seenIds.has(id)) {
      pushIssue(issues, {
        code: 'duplicate_id',
        detail: `Duplicate duration-mode id ${id}.`,
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

export function getEffectDurationModeById(
  registry: EffectDurationModeRegistry,
  id: string
): EffectDurationModeRecord | undefined {
  const normalized = normalizeToken(id)
  if (!normalized) {
    return undefined
  }

  return registry.entries.find((entry) => entry.id === normalized)
}

export function projectEffectDurationMode(record: EffectDurationModeRecord): EffectDurationModeProjection {
  return {
    id: record.id,
    label: record.label,
    requiresActiveUpkeep:
      record.focusRequirement !== 'none' || record.upkeepRequirement !== 'none',
    hasTimerExpiry: record.expiryBasis === 'timer',
    allowsDismissal: record.dismissalRule !== 'not_dismissible',
    reportingLabel: record.reportingLabel,
  }
}

export function projectEffectDurationModeRegistry(
  registry: EffectDurationModeRegistry
): readonly EffectDurationModeProjection[] {
  return registry.entries.map((entry) => projectEffectDurationMode(entry))
}

function defineDurationMode(input: EffectDurationModeRecord): EffectDurationModeRecord {
  return Object.freeze({
    ...input,
  })
}

/** Baseline catalog covering maintained, timed, continual, and dismiss-only mode families. */
export const DEFAULT_EFFECT_DURATION_MODE_REGISTRY: EffectDurationModeRegistry = Object.freeze({
  entries: Object.freeze([
    defineDurationMode({
      id: 'maintained',
      label: 'Maintained effect',
      focusRequirement: 'focus_required',
      upkeepRequirement: 'periodic_check',
      expiryBasis: 'condition',
      dismissalRule: 'dispel',
      interruptionBehavior: 'end',
      reportingLabel: 'Maintained (active upkeep)',
      summary: 'Effect remains active while focus and upkeep checks hold.',
    }),
    defineDurationMode({
      id: 'timed',
      label: 'Timed effect',
      focusRequirement: 'none',
      upkeepRequirement: 'none',
      expiryBasis: 'timer',
      dismissalRule: 'manual',
      interruptionBehavior: 'none',
      reportingLabel: 'Timed (expires by duration)',
      summary: 'Effect runs for a bounded duration and expires automatically.',
    }),
    defineDurationMode({
      id: 'continual',
      label: 'Continual effect',
      focusRequirement: 'none',
      upkeepRequirement: 'none',
      expiryBasis: 'none',
      dismissalRule: 'not_dismissible',
      interruptionBehavior: 'none',
      reportingLabel: 'Continual (passive ongoing)',
      summary: 'Passive persistent effect with no upkeep cadence.',
    }),
    defineDurationMode({
      id: 'dismiss_only',
      label: 'Dismiss-only effect',
      focusRequirement: 'focus_optional',
      upkeepRequirement: 'none',
      expiryBasis: 'none',
      dismissalRule: 'manual',
      interruptionBehavior: 'suspend',
      reportingLabel: 'Dismiss-only (until dismissed)',
      summary: 'Effect persists until manually dismissed or disrupted by interruption.',
    }),
  ]),
})
