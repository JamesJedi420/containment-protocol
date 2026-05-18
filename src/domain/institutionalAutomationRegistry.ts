/**
 * SPE-2101: pure institutional automation registry.
 *
 * Fixture-only slice for fallible institutional automation agents: role class,
 * authority tier, audit trail, conflict resolution, and operator projection.
 *
 * Non-goals: GameState persistence, UI, live entity registry integration,
 * authority-graph owner edge wiring, specialist unit integration, alert-center
 * runtime, autonomous actuation, distributed perception runtime, or franchise
 * source-canon import.
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type InstitutionalAutomationId = string

export type AutomationRoleClass =
  | 'observe'
  | 'retrieve'
  | 'classify'
  | 'patrol'
  | 'contain'
  | 'decontaminate'
  | 'archive'
  | 'translate'
  | 'escort'
  | 'misdirect'
  | 'censor'
  | 'repair'
  | 'warn'

export type AutomationAuthorityTier =
  | 'advisory'
  | 'task_execution'
  | 'field_autonomy'
  | 'emergency_override'
  | 'records_alteration'
  | 'command_escalation'

export type AutomationPersonhoodStatus =
  | 'tool'
  | 'agent'
  | 'assistant'
  | 'legal_person'
  | 'captive_intelligence'
  | 'emergent_mind'

export type AutomationCompromiseStatus =
  | 'none'
  | 'suspected'
  | 'confirmed'
  | 'contained'
  | 'isolated'

export type AutomationFailureMode =
  | 'silent'
  | 'false_negative'
  | 'false_positive'
  | 'over_actuation'
  | 'records_drift'
  | 'coordination_loss'

export type AutomationAuditState =
  | 'seed'
  | 'provisional'
  | 'active'
  | 'suspended'
  | 'decommissioned'

export type AutomationActionConfidence =
  | 'rumor'
  | 'low'
  | 'medium'
  | 'high'
  | 'verified'

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface AutomationSensorCapability {
  sensorId: string
  channel: string
  reliability: number
}

export interface AutomationOverridePath {
  requiresHumanAck: boolean
  escalationNodeIds: readonly string[]
  lockoutReasonCode?: string
}

export interface AutomationSensorInputRef {
  sensorId: string
  readingCode: string
  strength?: number
}

export interface AutomationActionRecord {
  actionId: string
  automationId: InstitutionalAutomationId
  week?: number
  triggerRuleId: string
  operatorId?: string
  confidence: AutomationActionConfidence
  sensorInputs: readonly AutomationSensorInputRef[]
  actionTaken: string
  reviewed: boolean
  assertsObjectiveTruth?: boolean
  provenanceTag?: string
}

export interface InstitutionalAutomationEntry {
  id: InstitutionalAutomationId
  label: string
  roleClass: AutomationRoleClass
  authorityTier: AutomationAuthorityTier
  personhoodStatus: AutomationPersonhoodStatus
  sensorSuite: readonly AutomationSensorCapability[]
  overridePath: AutomationOverridePath
  ownerNodeId: string
  trustScore: number
  compromiseStatus: AutomationCompromiseStatus
  failureMode: AutomationFailureMode
  auditState: AutomationAuditState
  actionLog: readonly AutomationActionRecord[]
  dueProcessHookIds?: readonly string[]
  seedRecord?: boolean
  metadata?: Readonly<Record<string, string | number | boolean>>
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type AutomationRegistryValidationIssueCode =
  | 'missing_id'
  | 'missing_label'
  | 'duplicate_action_id'
  | 'invalid_trust_score'
  | 'invalid_sensor_reliability'
  | 'missing_owner_node_id'
  | 'empty_sensor_suite'
  | 'franchise_token_in_label'
  | 'franchise_token_in_id'
  | 'franchise_token_in_field'
  | 'non_seed_missing_audit_trail'
  | 'objective_truth_without_confidence'
  | 'action_missing_required_fields'
  | 'action_automation_id_mismatch'
  | 'surveillance_tier_missing_due_process'
  | 'emergency_tier_missing_due_process'

export interface AutomationRegistryValidationIssue {
  code: AutomationRegistryValidationIssueCode
  detail: string
  severity: 'error' | 'warning'
  relatedIds?: readonly string[]
}

export interface AutomationRegistryValidationResult {
  valid: boolean
  issues: readonly AutomationRegistryValidationIssue[]
}

// ---------------------------------------------------------------------------
// Conflict resolution
// ---------------------------------------------------------------------------

export type AutomationConflictClaimSource = 'records' | 'sensors'

export interface AutomationConflictClaim {
  claimId: string
  subjectRef: string
  source: AutomationConflictClaimSource
  assertedSummary: string
  confidence: AutomationActionConfidence
  week?: number
}

export interface AutomationConflictClaimOutcome {
  claimId: string
  preferred: boolean
  reasonCode: string
}

export interface AutomationConflictResolution {
  winnerBotId: InstitutionalAutomationId
  loserBotId: InstitutionalAutomationId
  reasonCode: string
  claims: readonly AutomationConflictClaim[]
  claimOutcomes: readonly AutomationConflictClaimOutcome[]
}

// ---------------------------------------------------------------------------
// Operator feed projection
// ---------------------------------------------------------------------------

export type AutomationFeedRedactionReason =
  | 'policy_withhold_confidence'
  | 'policy_withhold_sensor_inputs'
  | 'policy_withhold_operator'
  | 'policy_withhold_action_detail'
  | 'policy_unreviewed_action'

export interface AutomationFeedProjectionPolicy {
  minimumConfidence?: AutomationActionConfidence
  redactSensorInputs?: boolean
  redactOperatorIds?: boolean
  redactUnreviewed?: boolean
  redactActionDetailBelowConfidence?: AutomationActionConfidence
}

export interface ProjectedAutomationAction {
  actionId: string
  automationId: InstitutionalAutomationId
  week?: number
  triggerRuleId: string
  operatorId?: string
  actionTaken: string | null
  confidence?: AutomationActionConfidence
  sensorInputs?: readonly AutomationSensorInputRef[]
  reviewed: boolean
  redacted: boolean
  redactionReasons: readonly AutomationFeedRedactionReason[]
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const AUTHORITY_TIER_ORDER: readonly AutomationAuthorityTier[] = [
  'advisory',
  'task_execution',
  'field_autonomy',
  'emergency_override',
  'records_alteration',
  'command_escalation',
]

const CONFIDENCE_ORDER: readonly AutomationActionConfidence[] = [
  'rumor',
  'low',
  'medium',
  'high',
  'verified',
]

const COMPROMISE_SEVERITY: Readonly<Record<AutomationCompromiseStatus, number>> = {
  none: 0,
  suspected: 1,
  contained: 2,
  confirmed: 3,
  isolated: 4,
}

const RECORDS_ROLE_CLASSES: ReadonlySet<AutomationRoleClass> = new Set([
  'archive',
  'classify',
  'retrieve',
])

const SENSOR_ROLE_CLASSES: ReadonlySet<AutomationRoleClass> = new Set(['observe', 'patrol', 'warn'])

const SURVEILLANCE_ROLE_CLASSES: ReadonlySet<AutomationRoleClass> = new Set(['observe', 'censor'])

const HIGH_SURVEILLANCE_TIERS: ReadonlySet<AutomationAuthorityTier> = new Set([
  'field_autonomy',
  'emergency_override',
  'records_alteration',
  'command_escalation',
])

const DUE_PROCESS_TIERS: ReadonlySet<AutomationAuthorityTier> = new Set([
  'emergency_override',
  'records_alteration',
])

export const FRANCHISE_TOKEN_PATTERN =
  /\b(scp|mtf|mobile task force|foundation|goc|gru|uiu|chaos insurgency|goi-|group of interest)\b/i

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort(
    (left, right) => left.localeCompare(right)
  )
}

function normalizeToken(value: string) {
  return value.trim()
}

function normalizeReliability(value: number) {
  if (!Number.isFinite(value)) {
    return Number.NaN
  }

  return Number(Math.max(0, Math.min(1, value)).toFixed(4))
}

function authorityTierRank(tier: AutomationAuthorityTier) {
  return AUTHORITY_TIER_ORDER.indexOf(tier)
}

function confidenceRank(confidence: AutomationActionConfidence) {
  const rank = CONFIDENCE_ORDER.indexOf(confidence)
  return rank >= 0 ? rank : -1
}

function isValidConfidence(confidence: AutomationActionConfidence | undefined) {
  return confidence !== undefined && confidenceRank(confidence) >= 0
}

function pushIssue(
  issues: AutomationRegistryValidationIssue[],
  issue: AutomationRegistryValidationIssue
) {
  issues.push(issue)
}

function sortValidationIssues(issues: AutomationRegistryValidationIssue[]) {
  return [...issues].sort((left, right) => {
    const codeCompare = left.code.localeCompare(right.code)
    if (codeCompare !== 0) {
      return codeCompare
    }

    const severityCompare = left.severity.localeCompare(right.severity)
    if (severityCompare !== 0) {
      return severityCompare
    }

    return left.detail.localeCompare(right.detail)
  })
}

function tokenContainsFranchiseReference(token: string) {
  return FRANCHISE_TOKEN_PATTERN.test(token)
}

function auditTrailExempt(entry: InstitutionalAutomationEntry) {
  return (
    entry.seedRecord === true ||
    entry.auditState === 'seed' ||
    entry.auditState === 'provisional'
  )
}

function requiresDueProcessHooks(entry: InstitutionalAutomationEntry) {
  if (DUE_PROCESS_TIERS.has(entry.authorityTier)) {
    return true
  }

  return (
    SURVEILLANCE_ROLE_CLASSES.has(entry.roleClass) &&
    HIGH_SURVEILLANCE_TIERS.has(entry.authorityTier)
  )
}

function hasDueProcessHooks(entry: InstitutionalAutomationEntry) {
  return (entry.dueProcessHookIds?.length ?? 0) > 0
}

function botSourceLean(
  bot: InstitutionalAutomationEntry
): AutomationConflictClaimSource {
  if (RECORDS_ROLE_CLASSES.has(bot.roleClass)) {
    return 'records'
  }

  if (SENSOR_ROLE_CLASSES.has(bot.roleClass)) {
    return 'sensors'
  }

  return 'records'
}

function compareBotsForConflict(
  botA: InstitutionalAutomationEntry,
  botB: InstitutionalAutomationEntry
): {
  winner: InstitutionalAutomationEntry
  loser: InstitutionalAutomationEntry
  reasonCode: string
} {
  const tierDelta = authorityTierRank(botA.authorityTier) - authorityTierRank(botB.authorityTier)
  if (tierDelta !== 0) {
    return tierDelta > 0
      ? { winner: botA, loser: botB, reasonCode: 'higher_authority_tier' }
      : { winner: botB, loser: botA, reasonCode: 'higher_authority_tier' }
  }

  const leanA = botSourceLean(botA)
  const leanB = botSourceLean(botB)
  if (leanA === 'records' && leanB === 'sensors') {
    return { winner: botA, loser: botB, reasonCode: 'records_over_sensors' }
  }
  if (leanB === 'records' && leanA === 'sensors') {
    return { winner: botB, loser: botA, reasonCode: 'records_over_sensors' }
  }

  const trustDelta = botA.trustScore - botB.trustScore
  if (trustDelta !== 0) {
    return trustDelta > 0
      ? { winner: botA, loser: botB, reasonCode: 'higher_trust_score' }
      : { winner: botB, loser: botA, reasonCode: 'higher_trust_score' }
  }

  const compromiseDelta =
    COMPROMISE_SEVERITY[botA.compromiseStatus] - COMPROMISE_SEVERITY[botB.compromiseStatus]
  if (compromiseDelta !== 0) {
    return compromiseDelta < 0
      ? { winner: botA, loser: botB, reasonCode: 'lower_compromise_severity' }
      : { winner: botB, loser: botA, reasonCode: 'lower_compromise_severity' }
  }

  const idCompare = botA.id.localeCompare(botB.id)
  if (idCompare <= 0) {
    return { winner: botA, loser: botB, reasonCode: 'stable_id_tiebreak' }
  }

  return { winner: botB, loser: botA, reasonCode: 'stable_id_tiebreak' }
}

function collectStringTokensFromEntry(entry: InstitutionalAutomationEntry, tokens: string[]) {
  tokens.push(entry.id, entry.label, entry.ownerNodeId)

  for (const sensor of entry.sensorSuite) {
    tokens.push(sensor.sensorId, sensor.channel)
  }

  if (entry.overridePath.lockoutReasonCode) {
    tokens.push(entry.overridePath.lockoutReasonCode)
  }

  for (const nodeId of entry.overridePath.escalationNodeIds) {
    tokens.push(nodeId)
  }

  for (const hookId of entry.dueProcessHookIds ?? []) {
    tokens.push(hookId)
  }

  for (const action of entry.actionLog) {
    tokens.push(
      action.actionId,
      action.automationId,
      action.triggerRuleId,
      action.actionTaken
    )
    if (action.operatorId) {
      tokens.push(action.operatorId)
    }
    if (action.provenanceTag) {
      tokens.push(action.provenanceTag)
    }
    for (const input of action.sensorInputs) {
      tokens.push(input.sensorId, input.readingCode)
    }
  }

  for (const value of Object.values(entry.metadata ?? {})) {
    if (typeof value === 'string') {
      tokens.push(value)
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateAutomationEntry(
  entry: InstitutionalAutomationEntry
): AutomationRegistryValidationResult {
  const issues: AutomationRegistryValidationIssue[] = []
  const id = normalizeToken(entry.id)
  const label = normalizeToken(entry.label)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Automation entry is missing id.',
    })
  } else if (tokenContainsFranchiseReference(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      severity: 'error',
      detail: `Automation id ${id} contains a franchise or source-literal token.`,
      relatedIds: [id],
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: 'Automation entry is missing label.',
      relatedIds: id ? [id] : undefined,
    })
  } else if (tokenContainsFranchiseReference(label)) {
    pushIssue(issues, {
      code: 'franchise_token_in_label',
      severity: 'error',
      detail: `Automation label ${label} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!normalizeToken(entry.ownerNodeId)) {
    pushIssue(issues, {
      code: 'missing_owner_node_id',
      severity: 'error',
      detail: `Automation ${id || '(unknown)'} is missing ownerNodeId.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const trustScore = entry.trustScore
  if (
    !Number.isFinite(trustScore) ||
    trustScore < 0 ||
    trustScore > 100 ||
    trustScore !== Math.trunc(trustScore)
  ) {
    pushIssue(issues, {
      code: 'invalid_trust_score',
      severity: 'error',
      detail: `Automation ${id || '(unknown)'} trustScore must be a finite integer between 0 and 100.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (entry.sensorSuite.length === 0) {
    pushIssue(issues, {
      code: 'empty_sensor_suite',
      severity: 'error',
      detail: `Automation ${id || '(unknown)'} requires at least one sensor capability.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  for (const sensor of entry.sensorSuite) {
    const reliability = normalizeReliability(sensor.reliability)
    if (!Number.isFinite(reliability)) {
      pushIssue(issues, {
        code: 'invalid_sensor_reliability',
        severity: 'error',
        detail: `Sensor ${sensor.sensorId} reliability must be a finite number between 0 and 1.`,
        relatedIds: uniqueSorted([id, sensor.sensorId]),
      })
    }

    for (const token of [sensor.sensorId, sensor.channel]) {
      if (tokenContainsFranchiseReference(token)) {
        pushIssue(issues, {
          code: 'franchise_token_in_field',
          severity: 'error',
          detail: `Sensor field ${token} contains a franchise or source-literal token.`,
          relatedIds: uniqueSorted([id, sensor.sensorId]),
        })
      }
    }
  }

  if (!auditTrailExempt(entry) && entry.actionLog.length === 0) {
    pushIssue(issues, {
      code: 'non_seed_missing_audit_trail',
      severity: 'error',
      detail: `Automation ${id || '(unknown)'} requires an audit actionLog unless seed/provisional.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const seenActionIds = new Set<string>()
  for (const action of entry.actionLog) {
    const actionId = normalizeToken(action.actionId)
    if (!actionId) {
      pushIssue(issues, {
        code: 'action_missing_required_fields',
        severity: 'error',
        detail: 'Automation action is missing actionId.',
        relatedIds: id ? [id] : undefined,
      })
    } else if (seenActionIds.has(actionId)) {
      pushIssue(issues, {
        code: 'duplicate_action_id',
        severity: 'error',
        detail: `Duplicate action id ${actionId}.`,
        relatedIds: uniqueSorted([id, actionId]),
      })
    } else {
      seenActionIds.add(actionId)
    }

    if (id && normalizeToken(action.automationId) !== id) {
      pushIssue(issues, {
        code: 'action_automation_id_mismatch',
        severity: 'error',
        detail: `Action ${actionId || '(unknown)'} automationId does not match entry id ${id}.`,
        relatedIds: uniqueSorted([id, actionId]),
      })
    }

    const missingFields: string[] = []
    if (!normalizeToken(action.triggerRuleId)) {
      missingFields.push('triggerRuleId')
    }
    if (!normalizeToken(action.actionTaken)) {
      missingFields.push('actionTaken')
    }
    if (action.reviewed !== true && action.reviewed !== false) {
      missingFields.push('reviewed')
    }
    if (!Array.isArray(action.sensorInputs)) {
      missingFields.push('sensorInputs')
    }

    if (missingFields.length > 0) {
      pushIssue(issues, {
        code: 'action_missing_required_fields',
        severity: 'error',
        detail: `Action ${actionId || '(unknown)'} is missing required fields: ${missingFields.join(', ')}.`,
        relatedIds: uniqueSorted([id, actionId]),
      })
    }

    if (action.assertsObjectiveTruth === true && !isValidConfidence(action.confidence)) {
      pushIssue(issues, {
        code: 'objective_truth_without_confidence',
        severity: 'error',
        detail: `Action ${actionId || '(unknown)'} asserts objective truth without valid confidence.`,
        relatedIds: uniqueSorted([id, actionId]),
      })
    }

    for (const token of [action.actionTaken, action.triggerRuleId, action.provenanceTag ?? '']) {
      if (token && tokenContainsFranchiseReference(token)) {
        pushIssue(issues, {
          code: 'franchise_token_in_field',
          severity: 'error',
          detail: `Action field for ${actionId || '(unknown)'} contains a franchise or source-literal token.`,
          relatedIds: uniqueSorted([id, actionId]),
        })
      }
    }
  }

  if (requiresDueProcessHooks(entry) && !hasDueProcessHooks(entry)) {
    const code = DUE_PROCESS_TIERS.has(entry.authorityTier)
      ? 'emergency_tier_missing_due_process'
      : 'surveillance_tier_missing_due_process'

    pushIssue(issues, {
      code,
      severity: 'warning',
      detail: `Automation ${id || '(unknown)'} requires dueProcessHookIds for its authority/surveillance posture.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const sortedIssues = sortValidationIssues(issues)
  const hasError = sortedIssues.some((issue) => issue.severity === 'error')

  return Object.freeze({
    valid: !hasError,
    issues: Object.freeze(
      sortedIssues.map((issue) =>
        Object.freeze({
          ...issue,
          ...(issue.relatedIds ? { relatedIds: Object.freeze([...issue.relatedIds]) } : {}),
        })
      )
    ),
  })
}

export function resolveAutomationConflict(
  botA: InstitutionalAutomationEntry,
  botB: InstitutionalAutomationEntry,
  claims: readonly AutomationConflictClaim[]
): AutomationConflictResolution {
  const sortedClaims = Object.freeze(
    [...claims]
      .sort((left, right) => left.claimId.localeCompare(right.claimId))
      .map((claim) => Object.freeze({ ...claim }))
  )

  const { winner, loser, reasonCode } = compareBotsForConflict(botA, botB)
  const winnerLean = botSourceLean(winner)

  const claimOutcomes = sortedClaims.map((claim) => {
    const preferred = claim.source === winnerLean
    return Object.freeze({
      claimId: claim.claimId,
      preferred,
      reasonCode: preferred ? 'winner_source_aligned' : 'winner_source_opposed',
    })
  })

  return Object.freeze({
    winnerBotId: winner.id,
    loserBotId: loser.id,
    reasonCode,
    claims: sortedClaims,
    claimOutcomes: Object.freeze(claimOutcomes),
  })
}

export function projectAutomationFeedForOperator(
  actions: readonly AutomationActionRecord[],
  policy: AutomationFeedProjectionPolicy
): readonly ProjectedAutomationAction[] {
  const sortedActions = [...actions].sort((left, right) => {
    const weekLeft = left.week ?? 0
    const weekRight = right.week ?? 0
    if (weekLeft !== weekRight) {
      return weekLeft - weekRight
    }

    return left.actionId.localeCompare(right.actionId)
  })

  const projected = sortedActions.map((action) => {
    const redactionReasons: AutomationFeedRedactionReason[] = []

    const minimumRank = policy.minimumConfidence
      ? confidenceRank(policy.minimumConfidence)
      : undefined
    const actionRank = confidenceRank(action.confidence)
    const redactDetailRank = policy.redactActionDetailBelowConfidence
      ? confidenceRank(policy.redactActionDetailBelowConfidence)
      : undefined

    let actionTaken: string | null = action.actionTaken
    let confidence: AutomationActionConfidence | undefined = action.confidence
    let operatorId: string | undefined = action.operatorId
    let includeSensorInputs = action.sensorInputs.length > 0

    if (minimumRank !== undefined && actionRank < minimumRank) {
      redactionReasons.push('policy_withhold_confidence')
      confidence = undefined
    }

    if (redactDetailRank !== undefined && actionRank < redactDetailRank) {
      redactionReasons.push('policy_withhold_action_detail')
      actionTaken = null
    }

    if (policy.redactUnreviewed && !action.reviewed) {
      redactionReasons.push('policy_unreviewed_action')
      actionTaken = null
    }

    if (policy.redactOperatorIds) {
      redactionReasons.push('policy_withhold_operator')
      operatorId = undefined
    }

    if (policy.redactSensorInputs) {
      redactionReasons.push('policy_withhold_sensor_inputs')
      includeSensorInputs = false
    }

    const uniqueReasons = uniqueSorted(redactionReasons) as AutomationFeedRedactionReason[]
    const redacted = uniqueReasons.length > 0

    return Object.freeze({
      actionId: action.actionId,
      automationId: action.automationId,
      ...(action.week !== undefined ? { week: action.week } : {}),
      triggerRuleId: action.triggerRuleId,
      ...(operatorId ? { operatorId } : {}),
      actionTaken,
      ...(confidence ? { confidence } : {}),
      ...(includeSensorInputs
        ? { sensorInputs: Object.freeze([...action.sensorInputs]) }
        : {}),
      reviewed: action.reviewed,
      redacted,
      redactionReasons: Object.freeze(uniqueReasons),
    })
  })

  return Object.freeze(projected)
}

export function collectInstitutionalAutomationTokens(
  entry: InstitutionalAutomationEntry
): readonly string[] {
  const tokens: string[] = []
  collectStringTokensFromEntry(entry, tokens)
  return uniqueSorted(tokens)
}

export function institutionalAutomationTokensContainFranchiseReferences(
  tokens: readonly string[]
) {
  return tokens.some((token) => tokenContainsFranchiseReference(token))
}
