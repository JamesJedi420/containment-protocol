// Canonical ProcedureDefinition -> cross-role action adapter (SPE-2995)
// Pure deterministic interoperability seam; no persistence, scheduler, or second resolver.
import type { AgentRole } from './agent/models'
import {
  resolveCrossRoleAction,
  validateCrossRoleActionProcedure,
  type CrossRoleActionParticipant,
  type CrossRoleActionProcedure,
  type CrossRoleActionResolutionResult,
  type ProcedurePrerequisite,
} from './crossRoleActionProcedure'
import {
  validateProcedureDefinition,
  type ProcedureDefinition,
} from './procedureDefinition'

export type ProcedureExecutionPrerequisiteClass =
  | 'knowledge_readiness'
  | 'authorization'
  | 'competency'
  | 'compatibility_equipment'
  | 'facility_environment'
  | 'operating_doctrine'
  | 'procedure_exhaustion'
  | 'subject_fit'

export type ProcedureExecutionPrerequisiteState = 'satisfied' | 'degraded' | 'blocked'

export interface ProcedureExecutionPrerequisiteDecision {
  /** Stable canonical owner, e.g. SPE-58, SPE-2078, SPE-1059, SPE-714, SPE-1896, SPE-874, SPE-3308, SPE-1907. */
  readonly ownerRef: string
  readonly prerequisiteClass: ProcedureExecutionPrerequisiteClass
  readonly state: ProcedureExecutionPrerequisiteState
  readonly reason: string
}

export interface ProcedureExecutionReceipt {
  readonly executionKey: string
  readonly evaluationFingerprint: string
  /** True only after the authoritative downstream owner committed the durable consequence. */
  readonly consequenceApplied: boolean
}

export interface ProcedureToActionAdapterInput {
  readonly definition: ProcedureDefinition
  /** Caller-selected role lanes after consuming canonical role/competency ownership. */
  readonly eligibleRoles: readonly AgentRole[]
  readonly requiredParticipantCount: number
  readonly participants: readonly CrossRoleActionParticipant[]
  /**
   * Externally owned readiness decisions. The adapter consumes these by reference;
   * it does not recreate knowledge, authorization, competency, equipment, facility,
   * doctrine, exhaustion, or subject-fit state.
   */
  readonly prerequisiteDecisions: readonly ProcedureExecutionPrerequisiteDecision[]
  /** Stable caller-owned operation/action identity used only for replay correlation. */
  readonly executionKey: string
  /** Caller-owned prior receipts; no adapter ledger is created or persisted. */
  readonly priorReceipts?: readonly ProcedureExecutionReceipt[]
}

export type ProcedureExecutionReadinessResult =
  | {
      ok: true
      outcome: 'permitted' | 'degraded'
      actionProcedure: CrossRoleActionProcedure
      evaluationFingerprint: string
      degradedReasons: readonly ProcedureExecutionPrerequisiteDecision[]
    }
  | {
      ok: false
      outcome:
        | 'invalid_procedure_definition'
        | 'invalid_action_contract'
        | 'owned_prerequisite_blocked'
      evaluationFingerprint: string
      blockedReasons: readonly ProcedureExecutionPrerequisiteDecision[]
      detail?: string
    }

export type CanonicalProcedureExecutionResult =
  | {
      ok: true
      outcome: 'executed'
      readiness: ProcedureExecutionReadinessResult & { ok: true }
      actionResult: CrossRoleActionResolutionResult & { ok: true }
      consequenceDisposition: 'caller_may_commit'
    }
  | {
      ok: true
      outcome: 'already_applied'
      readiness: ProcedureExecutionReadinessResult & { ok: true }
      consequenceDisposition: 'do_not_reapply'
    }
  | {
      ok: false
      outcome: 'readiness_blocked'
      readiness: ProcedureExecutionReadinessResult & { ok: false }
      consequenceDisposition: 'do_not_apply'
    }
  | {
      ok: false
      outcome: 'action_blocked'
      readiness: ProcedureExecutionReadinessResult & { ok: true }
      actionResult: CrossRoleActionResolutionResult & { ok: false }
      consequenceDisposition: 'do_not_apply'
    }

function codeUnitCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function normalizeText(value: string): string {
  return value.trim()
}

function stableDecisionKey(decision: ProcedureExecutionPrerequisiteDecision): string {
  return [
    decision.prerequisiteClass,
    normalizeText(decision.ownerRef),
    decision.state,
    normalizeText(decision.reason),
  ].join(':')
}

function stableParticipantKey(participant: CrossRoleActionParticipant): string {
  const statDomains = Object.entries(participant.statDomains)
    .sort(([a], [b]) => codeUnitCompare(a, b))
    .map(([domain, value]) => `${domain}=${String(value)}`)
    .join(',')
  const itemTags = [...participant.itemTags].sort(codeUnitCompare).join(',')
  return [
    participant.agentId,
    participant.role,
    statDomains,
    itemTags,
  ].join('|')
}

function buildEvaluationFingerprint(input: ProcedureToActionAdapterInput): string {
  const decisions = [...input.prerequisiteDecisions]
    .map(stableDecisionKey)
    .sort(codeUnitCompare)
    .join(';')
  const roles = [...input.eligibleRoles].sort(codeUnitCompare).join(',')
  const participants = [...input.participants]
    .map(stableParticipantKey)
    .sort(codeUnitCompare)
    .join(';')

  return [
    input.definition.schemaVersion,
    input.definition.procedureId.trim(),
    input.executionKey.trim(),
    `roles=${roles}`,
    `count=${input.requiredParticipantCount}`,
    `participants=${participants}`,
    `decisions=${decisions}`,
  ].join('|')
}

function mapProcedurePrerequisites(definition: ProcedureDefinition): readonly ProcedurePrerequisite[] {
  const itemTags = new Set<string>()
  for (const tag of definition.requirements.toolTags) {
    const normalized = tag.trim()
    if (normalized !== '') itemTags.add(normalized)
  }
  for (const tag of definition.requirements.deviceTags) {
    const normalized = tag.trim()
    if (normalized !== '') itemTags.add(normalized)
  }

  return [...itemTags]
    .sort(codeUnitCompare)
    .map((tag) => ({ type: 'item_tag' as const, tag }))
}

function buildActionProcedure(
  definition: ProcedureDefinition,
  eligibleRoles: readonly AgentRole[],
  requiredParticipantCount: number
): CrossRoleActionProcedure | null {
  const forbiddenRoles = new Set<AgentRole>(definition.restrictions.forbiddenRoles)
  const filteredRoles = [...new Set(eligibleRoles)].filter((role) => !forbiddenRoles.has(role))

  const validation = validateCrossRoleActionProcedure({
    procedureId: definition.procedureId,
    label: definition.canonicalName,
    eligibleRoles: filteredRoles,
    prerequisites: mapProcedurePrerequisites(definition),
    requiredParticipantCount,
  })

  return validation.ok ? validation.procedure : null
}

/**
 * Evaluate canonical procedure execution readiness without mutating any owned state.
 *
 * Canonical authoring fields are mapped only where the restored SPE-1434 contract
 * has a truthful representation (procedure identity/name and tool/device item tags).
 * Reagent quantities, certification/access, environment, doctrine, exhaustion,
 * knowledge, authorization, competency, and subject-fit remain externally owned
 * readiness decisions supplied by their canonical owners.
 */
export function evaluateCanonicalProcedureExecutionReadiness(
  input: ProcedureToActionAdapterInput
): ProcedureExecutionReadinessResult {
  const evaluationFingerprint = buildEvaluationFingerprint(input)
  const definitionValidation = validateProcedureDefinition(input.definition)
  if (!definitionValidation.ok) {
    return {
      ok: false,
      outcome: 'invalid_procedure_definition',
      evaluationFingerprint,
      blockedReasons: [],
      detail: `${definitionValidation.error}:${definitionValidation.field}`,
    }
  }

  if (input.executionKey.trim() === '') {
    return {
      ok: false,
      outcome: 'invalid_action_contract',
      evaluationFingerprint,
      blockedReasons: [],
      detail: 'empty_execution_key',
    }
  }

  const actionProcedure = buildActionProcedure(
    definitionValidation.definition,
    input.eligibleRoles,
    input.requiredParticipantCount
  )
  if (actionProcedure === null) {
    return {
      ok: false,
      outcome: 'invalid_action_contract',
      evaluationFingerprint,
      blockedReasons: [],
      detail: 'cross_role_action_validation_failed',
    }
  }

  const blockedReasons = input.prerequisiteDecisions
    .filter((decision) => decision.state === 'blocked')
    .sort((a, b) => codeUnitCompare(stableDecisionKey(a), stableDecisionKey(b)))
  if (blockedReasons.length > 0) {
    return {
      ok: false,
      outcome: 'owned_prerequisite_blocked',
      evaluationFingerprint,
      blockedReasons,
    }
  }

  const degradedReasons = input.prerequisiteDecisions
    .filter((decision) => decision.state === 'degraded')
    .sort((a, b) => codeUnitCompare(stableDecisionKey(a), stableDecisionKey(b)))

  return {
    ok: true,
    outcome: degradedReasons.length > 0 ? 'degraded' : 'permitted',
    actionProcedure,
    evaluationFingerprint,
    degradedReasons,
  }
}

/**
 * Resolve a canonical procedure through the restored SPE-1434 resolver.
 *
 * The adapter never applies durable consequences. A prior caller-owned receipt
 * with consequenceApplied=true suppresses duplicate application. Blocked prior
 * attempts do not prevent reevaluation when authoritative inputs change.
 */
export function executeCanonicalProcedureThroughCrossRoleAction(
  input: ProcedureToActionAdapterInput
): CanonicalProcedureExecutionResult {
  const readiness = evaluateCanonicalProcedureExecutionReadiness(input)
  if (!readiness.ok) {
    return {
      ok: false,
      outcome: 'readiness_blocked',
      readiness,
      consequenceDisposition: 'do_not_apply',
    }
  }

  const alreadyApplied = (input.priorReceipts ?? []).some(
    (receipt) =>
      receipt.executionKey === input.executionKey &&
      receipt.consequenceApplied
  )
  if (alreadyApplied) {
    return {
      ok: true,
      outcome: 'already_applied',
      readiness,
      consequenceDisposition: 'do_not_reapply',
    }
  }

  const actionResult = resolveCrossRoleAction({
    procedure: readiness.actionProcedure,
    participants: input.participants,
  })
  if (!actionResult.ok) {
    return {
      ok: false,
      outcome: 'action_blocked',
      readiness,
      actionResult,
      consequenceDisposition: 'do_not_apply',
    }
  }

  return {
    ok: true,
    outcome: 'executed',
    readiness,
    actionResult,
    consequenceDisposition: 'caller_may_commit',
  }
}

export function createProcedureExecutionReceipt(
  executionKey: string,
  evaluationFingerprint: string,
  consequenceApplied: boolean
): ProcedureExecutionReceipt {
  return {
    executionKey,
    evaluationFingerprint,
    consequenceApplied,
  }
}
