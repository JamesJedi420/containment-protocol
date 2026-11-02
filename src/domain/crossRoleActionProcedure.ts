// Cross-role action procedure contract and exemplar action seam (SPE-1434)
// Domain-only, deterministic, no RNG dependency.
import type { AgentRole, StatDomain } from './agent/models'

// ─── Prerequisite types ───────────────────────────────────────────────────────

export interface StatPrerequisite {
  readonly type: 'min_stat'
  readonly domain: StatDomain
  readonly minValue: number
}

export interface ItemTagPrerequisite {
  readonly type: 'item_tag'
  readonly tag: string
}

export type ProcedurePrerequisite = StatPrerequisite | ItemTagPrerequisite

// ─── Procedure definition ─────────────────────────────────────────────────────

export interface CrossRoleActionProcedure {
  readonly procedureId: string
  readonly label: string
  readonly eligibleRoles: readonly AgentRole[]
  readonly prerequisites: readonly ProcedurePrerequisite[]
  readonly requiredParticipantCount: number
}

// ─── Validation ───────────────────────────────────────────────────────────────

export type CrossRoleActionValidationFailure =
  | 'invalid_procedure_id'
  | 'empty_label'
  | 'empty_eligible_roles'
  | 'invalid_participant_count'
  | 'invalid_prerequisite'

export type CrossRoleActionValidationResult =
  | { ok: true; procedure: CrossRoleActionProcedure }
  | { ok: false; error: CrossRoleActionValidationFailure }

export function validateCrossRoleActionProcedure(input: {
  procedureId: string
  label: string
  eligibleRoles: readonly AgentRole[]
  prerequisites: readonly ProcedurePrerequisite[]
  requiredParticipantCount: number
}): CrossRoleActionValidationResult {
  if (!input.procedureId || input.procedureId.trim() === '') {
    return { ok: false, error: 'invalid_procedure_id' }
  }
  if (!input.label || input.label.trim() === '') {
    return { ok: false, error: 'empty_label' }
  }
  if (!input.eligibleRoles || input.eligibleRoles.length === 0) {
    return { ok: false, error: 'empty_eligible_roles' }
  }
  if (!Number.isInteger(input.requiredParticipantCount) || input.requiredParticipantCount < 1) {
    return { ok: false, error: 'invalid_participant_count' }
  }
  for (const prereq of input.prerequisites) {
    if (prereq.type === 'min_stat' && prereq.minValue < 0) {
      return { ok: false, error: 'invalid_prerequisite' }
    }
    if (prereq.type === 'item_tag' && (!prereq.tag || prereq.tag.trim() === '')) {
      return { ok: false, error: 'invalid_prerequisite' }
    }
  }
  return {
    ok: true,
    procedure: {
      procedureId: input.procedureId.trim(),
      label: input.label.trim(),
      eligibleRoles: [...input.eligibleRoles],
      prerequisites: [...input.prerequisites],
      requiredParticipantCount: input.requiredParticipantCount,
    },
  }
}

// ─── Resolution ───────────────────────────────────────────────────────────────

export interface CrossRoleActionParticipant {
  readonly agentId: string
  readonly role: AgentRole
  readonly statDomains: Partial<Record<StatDomain, number>>
  readonly itemTags: readonly string[]
}

export interface CrossRoleActionResolutionInput {
  readonly procedure: CrossRoleActionProcedure
  readonly participants: readonly CrossRoleActionParticipant[]
}

export interface UnmetPrerequisiteDetail {
  readonly prerequisite: ProcedurePrerequisite
  readonly reason: 'missing_item_tag' | 'stat_below_threshold'
}

export type CrossRoleActionResolutionResult =
  | { ok: true; outcome: 'success'; contributingRoles: readonly AgentRole[] }
  | { ok: false; outcome: 'insufficient_participants'; required: number; present: number }
  | { ok: false; outcome: 'ineligible_roles'; ineligibleRoles: readonly AgentRole[] }
  | { ok: false; outcome: 'unmet_prerequisites'; unmetPrerequisites: readonly UnmetPrerequisiteDetail[] }

export function resolveCrossRoleAction(
  input: CrossRoleActionResolutionInput
): CrossRoleActionResolutionResult {
  const { procedure, participants } = input

  // Gate 1: participant count
  if (participants.length < procedure.requiredParticipantCount) {
    return {
      ok: false,
      outcome: 'insufficient_participants',
      required: procedure.requiredParticipantCount,
      present: participants.length,
    }
  }

  // Gate 2: all participants must have eligible roles
  const eligibleRoleSet = new Set<AgentRole>(procedure.eligibleRoles)
  const ineligibleRoles: AgentRole[] = []
  for (const p of participants) {
    if (!eligibleRoleSet.has(p.role)) {
      ineligibleRoles.push(p.role)
    }
  }
  if (ineligibleRoles.length > 0) {
    return { ok: false, outcome: 'ineligible_roles', ineligibleRoles }
  }

  // Gate 3: prerequisites — each must be satisfied by at least one participant
  const unmetPrerequisites: UnmetPrerequisiteDetail[] = []
  for (const prereq of procedure.prerequisites) {
    const isMet = participants.some((p) => {
      if (prereq.type === 'min_stat') {
        return (p.statDomains[prereq.domain] ?? 0) >= prereq.minValue
      }
      if (prereq.type === 'item_tag') {
        return p.itemTags.includes(prereq.tag)
      }
      return false
    })
    if (!isMet) {
      unmetPrerequisites.push({
        prerequisite: prereq,
        reason: prereq.type === 'item_tag' ? 'missing_item_tag' : 'stat_below_threshold',
      })
    }
  }
  if (unmetPrerequisites.length > 0) {
    return { ok: false, outcome: 'unmet_prerequisites', unmetPrerequisites }
  }

  return {
    ok: true,
    outcome: 'success',
    contributingRoles: participants.map((p) => p.role),
  }
}

// ─── Exemplar action ──────────────────────────────────────────────────────────

// joint_evidence_processing: requires two participants (investigator + field_recon),
// minimum insight stat of 3, and at least one participant carrying evidence_kit.
export const JOINT_EVIDENCE_PROCESSING: CrossRoleActionProcedure = {
  procedureId: 'joint_evidence_processing',
  label: 'Joint Evidence Processing',
  eligibleRoles: ['investigator', 'field_recon'],
  prerequisites: [
    { type: 'min_stat', domain: 'insight', minValue: 3 },
    { type: 'item_tag', tag: 'evidence_kit' },
  ],
  requiredParticipantCount: 2,
}
