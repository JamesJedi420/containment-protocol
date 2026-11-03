import { describe, expect, it } from 'vitest'
import type { AgentRole } from '../domain/agent/models'
import type { CrossRoleActionParticipant } from '../domain/crossRoleActionProcedure'
import {
  BINDING_SIGIL,
  PROCEDURE_DEFINITION_SCHEMA_VERSION,
  type ProcedureDefinition,
} from '../domain/procedureDefinition'
import {
  createProcedureExecutionReceipt,
  evaluateCanonicalProcedureExecutionReadiness,
  executeCanonicalProcedureThroughCrossRoleAction,
  type ProcedureExecutionPrerequisiteDecision,
} from '../domain/procedureToActionAdapter'

function makeProcedure(overrides: Partial<ProcedureDefinition> = {}): ProcedureDefinition {
  return {
    ...BINDING_SIGIL,
    schemaVersion: PROCEDURE_DEFINITION_SCHEMA_VERSION,
    procedureId: 'field_binding',
    canonicalName: 'Field Binding',
    requirements: {
      speech: 'none',
      gesture: 'none',
      toolTags: ['evidence_kit'],
      reagents: [],
      requiresDiagram: false,
      deviceTags: [],
      environmentalConditions: [],
    },
    restrictions: {
      forbiddenRoles: [],
      requiredCertifications: [],
      requiresSpecialistAccess: false,
      usageCap: null,
    },
    availability: { rating: 'common' },
    provenance: {
      sourceSystem: 'field_manual',
      acquiredViaResearch: false,
      researchDiscipline: null,
      restrictedFaction: null,
    },
    ...overrides,
  }
}

function makeParticipant(
  agentId: string,
  role: AgentRole,
  itemTags: readonly string[] = []
): CrossRoleActionParticipant {
  return {
    agentId,
    role,
    statDomains: {},
    itemTags,
  }
}

function satisfied(
  prerequisiteClass: ProcedureExecutionPrerequisiteDecision['prerequisiteClass'],
  ownerRef: string
): ProcedureExecutionPrerequisiteDecision {
  return {
    prerequisiteClass,
    ownerRef,
    state: 'satisfied',
    reason: 'verified',
  }
}

const baseDecisions: readonly ProcedureExecutionPrerequisiteDecision[] = [
  satisfied('knowledge_readiness', 'SPE-58'),
  satisfied('authorization', 'SPE-2078'),
  satisfied('competency', 'SPE-1059'),
  satisfied('compatibility_equipment', 'SPE-714'),
  satisfied('facility_environment', 'SPE-1896'),
  satisfied('operating_doctrine', 'SPE-874'),
  satisfied('procedure_exhaustion', 'SPE-3308'),
  satisfied('subject_fit', 'SPE-1907'),
]

function makeInput(
  overrides: Partial<Parameters<typeof evaluateCanonicalProcedureExecutionReadiness>[0]> = {}
) {
  return {
    definition: makeProcedure(),
    eligibleRoles: ['investigator', 'field_recon'] as const,
    requiredParticipantCount: 2,
    participants: [
      makeParticipant('agent-a', 'investigator', ['evidence_kit']),
      makeParticipant('agent-b', 'field_recon'),
    ],
    requiredPrerequisites: baseDecisions.map(({ prerequisiteClass, ownerRef }) => ({
      prerequisiteClass,
      ownerRef,
    })),
    prerequisiteDecisions: baseDecisions,
    executionKey: 'procedure-execution:case-1:field-binding',
    ...overrides,
  }
}

describe('SPE-2995 ProcedureDefinition -> cross-role action adapter', () => {
  it('maps a valid canonical procedure and executes through the restored resolver', () => {
    const result = executeCanonicalProcedureThroughCrossRoleAction(makeInput())

    expect(result.ok).toBe(true)
    expect(result.outcome).toBe('executed')
    if (!result.ok || result.outcome !== 'executed') throw new Error('expected executed')

    expect(result.readiness.actionProcedure.procedureId).toBe('field_binding')
    expect(result.readiness.actionProcedure.prerequisites).toEqual([
      { type: 'item_tag', tag: 'evidence_kit' },
    ])
    expect(result.actionResult.outcome).toBe('success')
    expect(result.consequenceDisposition).toBe('caller_may_commit')
  })

  it('fails closed when a declared owner prerequisite has no decision', () => {
    const result = evaluateCanonicalProcedureExecutionReadiness(
      makeInput({
        prerequisiteDecisions: baseDecisions.filter(
          (decision) => decision.prerequisiteClass !== 'operating_doctrine'
        ),
      })
    )

    expect(result.ok).toBe(false)
    expect(result.outcome).toBe('owned_prerequisite_blocked')
    if (result.ok) throw new Error('expected blocked readiness')
    expect(result.blockedReasons).toContainEqual({
      prerequisiteClass: 'operating_doctrine',
      ownerRef: 'SPE-874',
      state: 'blocked',
      reason: 'missing_required_owner_decision',
    })
  })

  it('preserves owned authorization failure as an explicit readiness block', () => {
    const result = executeCanonicalProcedureThroughCrossRoleAction(
      makeInput({
        prerequisiteDecisions: [
          ...baseDecisions.filter((decision) => decision.prerequisiteClass !== 'authorization'),
          {
            prerequisiteClass: 'authorization',
            ownerRef: 'SPE-2078',
            state: 'blocked',
            reason: 'mission_read_in_missing',
          },
        ],
      })
    )

    expect(result.ok).toBe(false)
    expect(result.outcome).toBe('readiness_blocked')
    if (result.ok) throw new Error('expected readiness block')
    expect(result.readiness.outcome).toBe('owned_prerequisite_blocked')
    expect(result.readiness.blockedReasons).toEqual([
      {
        prerequisiteClass: 'authorization',
        ownerRef: 'SPE-2078',
        state: 'blocked',
        reason: 'mission_read_in_missing',
      },
    ])
  })

  it('preserves subject-fit ownership instead of inferring universal validity', () => {
    const result = evaluateCanonicalProcedureExecutionReadiness(
      makeInput({
        prerequisiteDecisions: [
          ...baseDecisions.filter((decision) => decision.prerequisiteClass !== 'subject_fit'),
          {
            prerequisiteClass: 'subject_fit',
            ownerRef: 'SPE-1907',
            state: 'blocked',
            reason: 'subject_fit_unverified',
          },
        ],
      })
    )

    expect(result.ok).toBe(false)
    expect(result.outcome).toBe('owned_prerequisite_blocked')
    if (result.ok) throw new Error('expected blocked readiness')
    expect(result.blockedReasons[0]?.ownerRef).toBe('SPE-1907')
  })

  it('surfaces degraded owned state without converting it to a hidden lock', () => {
    const result = evaluateCanonicalProcedureExecutionReadiness(
      makeInput({
        prerequisiteDecisions: [
          ...baseDecisions,
          {
            prerequisiteClass: 'operating_doctrine',
            ownerRef: 'SPE-874',
            state: 'degraded',
            reason: 'attestation_near_expiry',
          },
        ],
      })
    )

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected readiness')
    expect(result.outcome).toBe('degraded')
    expect(result.degradedReasons).toHaveLength(1)
    expect(result.degradedReasons[0]?.reason).toBe('attestation_near_expiry')
  })

  it('blocks through restored action prerequisites when required equipment is absent', () => {
    const result = executeCanonicalProcedureThroughCrossRoleAction(
      makeInput({
        participants: [
          makeParticipant('agent-a', 'investigator'),
          makeParticipant('agent-b', 'field_recon'),
        ],
      })
    )

    expect(result.ok).toBe(false)
    expect(result.outcome).toBe('action_blocked')
    if (result.ok || result.outcome !== 'action_blocked') throw new Error('expected action block')
    expect(result.actionResult.outcome).toBe('unmet_prerequisites')
  })

  it('keeps distinct prerequisite decisions collision-safe in the fingerprint', () => {
    const first = evaluateCanonicalProcedureExecutionReadiness(
      makeInput({
        requiredPrerequisites: [
          { prerequisiteClass: 'authorization', ownerRef: 'SPE-2078:foo' },
        ],
        prerequisiteDecisions: [
          {
            prerequisiteClass: 'authorization',
            ownerRef: 'SPE-2078:foo',
            state: 'blocked',
            reason: 'bar',
          },
        ],
      })
    )
    const second = evaluateCanonicalProcedureExecutionReadiness(
      makeInput({
        requiredPrerequisites: [
          { prerequisiteClass: 'authorization', ownerRef: 'SPE-2078' },
        ],
        prerequisiteDecisions: [
          {
            prerequisiteClass: 'authorization',
            ownerRef: 'SPE-2078',
            state: 'blocked',
            reason: 'foo:bar',
          },
        ],
      })
    )

    expect(first.evaluationFingerprint).not.toBe(second.evaluationFingerprint)
  })

  it('is stable for unchanged authoritative inputs', () => {
    const input = makeInput()
    const first = evaluateCanonicalProcedureExecutionReadiness(input)
    const second = evaluateCanonicalProcedureExecutionReadiness(input)

    expect(second).toEqual(first)
  })

  it('permits deterministic reevaluation when an authoritative prerequisite changes', () => {
    const blocked = evaluateCanonicalProcedureExecutionReadiness(
      makeInput({
        prerequisiteDecisions: [
          ...baseDecisions.filter((decision) => decision.prerequisiteClass !== 'procedure_exhaustion'),
          {
            prerequisiteClass: 'procedure_exhaustion',
            ownerRef: 'SPE-3308',
            state: 'blocked',
            reason: 'option_burned',
          },
        ],
      })
    )
    const restored = evaluateCanonicalProcedureExecutionReadiness(makeInput())

    expect(blocked.ok).toBe(false)
    expect(restored.ok).toBe(true)
    expect(blocked.evaluationFingerprint).not.toBe(restored.evaluationFingerprint)
  })

  it('does not reapply a committed consequence on duplicate delivery', () => {
    const first = executeCanonicalProcedureThroughCrossRoleAction(makeInput())
    expect(first.ok).toBe(true)
    expect(first.outcome).toBe('executed')
    if (!first.ok || first.outcome !== 'executed') throw new Error('expected executed')

    const receipt = createProcedureExecutionReceipt(
      'procedure-execution:case-1:field-binding',
      first.readiness.evaluationFingerprint,
      true
    )
    const replay = executeCanonicalProcedureThroughCrossRoleAction(
      makeInput({ priorReceipts: [receipt] })
    )

    expect(replay.ok).toBe(true)
    expect(replay.outcome).toBe('already_applied')
    expect(replay.consequenceDisposition).toBe('do_not_reapply')
  })

  it('does not let a prior blocked attempt prevent reevaluation after state changes', () => {
    const blockedInput = makeInput({
      prerequisiteDecisions: [
        ...baseDecisions.filter((decision) => decision.prerequisiteClass !== 'facility_environment'),
        {
          prerequisiteClass: 'facility_environment',
          ownerRef: 'SPE-1896',
          state: 'blocked',
          reason: 'unsafe_room_state',
        },
      ],
    })
    const blocked = evaluateCanonicalProcedureExecutionReadiness(blockedInput)
    expect(blocked.ok).toBe(false)

    const priorBlockedReceipt = createProcedureExecutionReceipt(
      blockedInput.executionKey,
      blocked.evaluationFingerprint,
      false
    )
    const recovered = executeCanonicalProcedureThroughCrossRoleAction(
      makeInput({ priorReceipts: [priorBlockedReceipt] })
    )

    expect(recovered.ok).toBe(true)
    expect(recovered.outcome).toBe('executed')
  })

  it('fails closed for an invalid canonical ProcedureDefinition', () => {
    const result = evaluateCanonicalProcedureExecutionReadiness(
      makeInput({ definition: makeProcedure({ canonicalName: '   ' }) })
    )

    expect(result.ok).toBe(false)
    expect(result.outcome).toBe('invalid_procedure_definition')
    if (result.ok) throw new Error('expected invalid definition')
    expect(result.detail).toBe('empty_canonical_name:canonicalName')
  })

  it('fails closed when forbidden-role filtering leaves no executable role lane', () => {
    const definition = makeProcedure({
      restrictions: {
        forbiddenRoles: ['investigator', 'field_recon'],
        requiredCertifications: [],
        requiresSpecialistAccess: false,
        usageCap: null,
      },
    })
    const result = evaluateCanonicalProcedureExecutionReadiness(
      makeInput({ definition })
    )

    expect(result.ok).toBe(false)
    expect(result.outcome).toBe('invalid_action_contract')
  })
})
