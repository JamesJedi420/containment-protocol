import { describe, expect, it } from 'vitest'
import type { AgentRole } from '../domain/agent/models'
import type { CrossRoleActionParticipant } from '../domain/crossRoleActionProcedure'
import {
  BINDING_SIGIL,
  PROCEDURE_DEFINITION_SCHEMA_VERSION,
  RESONANCE_CONSTRUCT,
  type ProcedureDefinition,
} from '../domain/procedureDefinition'
import {
  createProcedureExecutionReceipt,
  evaluateCanonicalProcedureExecutionReadiness,
  executeCanonicalProcedureThroughCrossRoleAction,
  type ProcedureExecutionPrerequisiteDecision,
  type ProcedureExecutionReceipt,
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

  it.each(['blocked', 'degraded'] as const)(
    'preserves every duplicate owner reason with %s taking precedence in either order',
    (state) => {
      const adverse: ProcedureExecutionPrerequisiteDecision = {
        prerequisiteClass: 'authorization',
        ownerRef: 'SPE-2078',
        state,
        reason: 'read_in_limited',
      }
      const otherReason = { ...adverse, reason: 'permit_limited' }
      const decisions = [...baseDecisions, adverse, otherReason]
      const first = evaluateCanonicalProcedureExecutionReadiness(
        makeInput({ prerequisiteDecisions: decisions })
      )
      const reversed = evaluateCanonicalProcedureExecutionReadiness(
        makeInput({ prerequisiteDecisions: [...decisions].reverse() })
      )

      expect(reversed).toEqual(first)
      if (state === 'blocked') {
        expect(first.outcome).toBe('owned_prerequisite_blocked')
        if (first.ok) throw new Error('expected block to dominate')
        expect(first.blockedReasons).toEqual([otherReason, adverse])
      } else {
        expect(first.outcome).toBe('degraded')
        if (!first.ok) throw new Error('expected degraded readiness')
        expect(first.degradedReasons).toEqual([otherReason, adverse])
      }
    }
  )

  it('matches decisions by both owner and class without losing independent blockers', () => {
    const independentBlock: ProcedureExecutionPrerequisiteDecision = {
      prerequisiteClass: 'authorization',
      ownerRef: 'independent_permit_owner',
      state: 'blocked',
      reason: 'prohibited',
    }
    const result = evaluateCanonicalProcedureExecutionReadiness(
      makeInput({
        prerequisiteDecisions: [
          ...baseDecisions.filter((decision) => decision.prerequisiteClass !== 'authorization'),
          independentBlock,
          satisfied('knowledge_readiness', 'SPE-2078'),
        ],
      })
    )

    if (result.ok) throw new Error('expected missing authorization owner')
    expect(result.blockedReasons).toContainEqual(independentBlock)
    expect(result.blockedReasons).toContainEqual({
      prerequisiteClass: 'authorization',
      ownerRef: 'SPE-2078',
      state: 'blocked',
      reason: 'missing_required_owner_decision',
    })
  })

  it('executes with scene equipment supplied by its owners rather than participant inventory', () => {
    const result = executeCanonicalProcedureThroughCrossRoleAction(
      makeInput({
        definition: RESONANCE_CONSTRUCT,
        participants: [
          makeParticipant('agent-a', 'investigator', ['construct_core']),
          makeParticipant('agent-b', 'field_recon'),
        ],
      })
    )

    if (!result.ok || result.outcome !== 'executed') throw new Error('expected executed')
    expect(result.readiness.actionProcedure.prerequisites).toEqual([
      { type: 'item_tag', tag: 'construct_core' },
    ])
    expect(result.actionResult.outcome).toBe('success')
  })

  it.each(['compatibility_equipment', 'facility_environment'] as const)(
    'cannot use participant equipment to bypass a missing or blocked %s decision',
    (prerequisiteClass) => {
      const owner = baseDecisions.find(
        (decision) => decision.prerequisiteClass === prerequisiteClass
      )!
      const remaining = baseDecisions.filter((decision) => decision !== owner)
      const input = makeInput({
        definition: RESONANCE_CONSTRUCT,
        participants: [
          makeParticipant('agent-a', 'investigator', ['construct_core', 'fabrication_rig']),
          makeParticipant('agent-b', 'field_recon'),
        ],
      })
      for (const prerequisiteDecisions of [
        remaining,
        [...remaining, { ...owner, state: 'blocked' as const, reason: 'scene_device_unavailable' }],
      ]) {
        const result = executeCanonicalProcedureThroughCrossRoleAction({
          ...input,
          prerequisiteDecisions,
        })
        expect(result.outcome).toBe('readiness_blocked')
        if (result.ok || result.readiness.ok) throw new Error('expected owner block')
        expect(result.readiness.blockedReasons).toContainEqual({
          ...owner,
          state: 'blocked',
          reason:
            prerequisiteDecisions === remaining
              ? 'missing_required_owner_decision'
              : 'scene_device_unavailable',
        })
      }
    }
  )

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
    if (result.ok || result.outcome !== 'readiness_blocked') {
      throw new Error('expected readiness block')
    }
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
        requiredPrerequisites: [{ prerequisiteClass: 'authorization', ownerRef: 'SPE-2078' }],
        prerequisiteDecisions: [
          {
            prerequisiteClass: 'authorization',
            ownerRef: 'SPE-2078:blocked',
            state: 'degraded',
            reason: 'x',
          },
        ],
      })
    )
    const second = evaluateCanonicalProcedureExecutionReadiness(
      makeInput({
        requiredPrerequisites: [{ prerequisiteClass: 'authorization', ownerRef: 'SPE-2078' }],
        prerequisiteDecisions: [
          {
            prerequisiteClass: 'authorization',
            ownerRef: 'SPE-2078',
            state: 'blocked',
            reason: 'degraded:x',
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

  const fingerprintChanges: readonly [
    string,
    (definition: ProcedureDefinition) => ProcedureDefinition,
  ][] = [
    ['canonicalName', (d) => ({ ...d, canonicalName: 'Revised Binding' })],
    ['tier', (d) => ({ ...d, tier: 5 })],
    ['taxonomy.intent', (d) => ({ ...d, taxonomy: { ...d.taxonomy, intent: 'summoning' } })],
    [
      'taxonomy.executionMethod',
      (d) => ({ ...d, taxonomy: { ...d.taxonomy, executionMethod: 'martial' } }),
    ],
    [
      'requirements.speech',
      (d) => ({ ...d, requirements: { ...d.requirements, speech: 'required' } }),
    ],
    [
      'requirements.toolTags',
      (d) => ({ ...d, requirements: { ...d.requirements, toolTags: ['new_tool'] } }),
    ],
    [
      'requirements.deviceTags',
      (d) => ({ ...d, requirements: { ...d.requirements, deviceTags: ['fabrication_rig'] } }),
    ],
    [
      'requirements.reagents.quantity',
      (d) => ({
        ...d,
        requirements: {
          ...d.requirements,
          reagents: [{ tag: 'iron', quantity: -1, consumable: true }],
        },
      }),
    ],
    [
      'restrictions.forbiddenRoles',
      (d) => ({ ...d, restrictions: { ...d.restrictions, forbiddenRoles: ['investigator'] } }),
    ],
    ['targeting.rangeMeters', (d) => ({ ...d, targeting: { ...d.targeting, rangeMeters: -1 } })],
    [
      'availability.sourceCount',
      (d) => ({ ...d, availability: { ...d.availability, sourceCount: -1 } }),
    ],
    ['entityPayload presence', (d) => ({ ...d, entityPayload: RESONANCE_CONSTRUCT.entityPayload })],
  ]

  it.each(fingerprintChanges)('fingerprints the consumed canonical field %s', (_, change) => {
    const definition = makeProcedure()
    const first = evaluateCanonicalProcedureExecutionReadiness(makeInput({ definition }))
    const changed = evaluateCanonicalProcedureExecutionReadiness(
      makeInput({ definition: change(definition) })
    )
    expect(changed.evaluationFingerprint).not.toBe(first.evaluationFingerprint)
    expect(
      evaluateCanonicalProcedureExecutionReadiness(makeInput({ definition: change(definition) }))
    ).toEqual(changed)
  })

  it('keeps equivalent canonical property order and normalized tag sets stable', () => {
    const definition = makeProcedure()
    const equivalent = {
      ...definition,
      requirements: { ...definition.requirements, toolTags: [' evidence_kit ', 'evidence_kit'] },
      taxonomy: {
        originTradition: definition.taxonomy.originTradition,
        executionMethod: definition.taxonomy.executionMethod,
        effectDomain: definition.taxonomy.effectDomain,
        intent: definition.taxonomy.intent,
      },
    }
    expect(
      evaluateCanonicalProcedureExecutionReadiness(makeInput({ definition: equivalent }))
    ).toEqual(evaluateCanonicalProcedureExecutionReadiness(makeInput({ definition })))
  })

  it('permits deterministic reevaluation when an authoritative prerequisite changes', () => {
    const blocked = evaluateCanonicalProcedureExecutionReadiness(
      makeInput({
        prerequisiteDecisions: [
          ...baseDecisions.filter(
            (decision) => decision.prerequisiteClass !== 'procedure_exhaustion'
          ),
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
        ...baseDecisions.filter(
          (decision) => decision.prerequisiteClass !== 'facility_environment'
        ),
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

  it('integrates readiness loss, owner recovery, and duplicate delivery without double application', () => {
    const input = makeInput()
    const unavailable = {
      ...input,
      prerequisiteDecisions: [
        ...baseDecisions.filter((d) => d.prerequisiteClass !== 'facility_environment'),
        {
          ...satisfied('facility_environment', 'SPE-1896'),
          state: 'blocked' as const,
          reason: 'patient_no_longer_resting',
        },
      ],
    }
    const receipts: ProcedureExecutionReceipt[] = []
    let durableConsequenceCount = 0
    const deliver = (request: typeof input) => {
      const result = executeCanonicalProcedureThroughCrossRoleAction({
        ...request,
        priorReceipts: receipts,
      })
      if (result.consequenceDisposition === 'caller_may_commit') {
        durableConsequenceCount += 1
        receipts.push(
          createProcedureExecutionReceipt(
            request.executionKey,
            result.readiness.evaluationFingerprint,
            true
          )
        )
      }
      return result
    }

    expect(deliver(unavailable).outcome).toBe('readiness_blocked')
    expect(durableConsequenceCount).toBe(0)
    expect(deliver(input).outcome).toBe('executed')
    const replay = deliver(unavailable)
    expect(replay.outcome).toBe('already_applied')
    expect(replay.consequenceDisposition).toBe('do_not_reapply')
    expect(replay.readiness.ok).toBe(false)
    if (replay.readiness.ok) throw new Error('expected current readiness loss')
    expect(replay.readiness.blockedReasons[0]?.reason).toBe('patient_no_longer_resting')
    expect(deliver(input).outcome).toBe('already_applied')
    expect(durableConsequenceCount).toBe(1)
    expect(receipts).toHaveLength(1)
  })

  it.each([
    ['operation', ' operation '],
    [' operation ', 'operation'],
    [' operation ', ' operation '],
  ])('matches committed receipt key %j to replay key %j', (receiptKey, executionKey) => {
    const result = executeCanonicalProcedureThroughCrossRoleAction(
      makeInput({
        executionKey,
        priorReceipts: [
          {
            executionKey: receiptKey,
            evaluationFingerprint: 'earlier_inputs',
            consequenceApplied: true,
          },
        ],
      })
    )
    expect(result.outcome).toBe('already_applied')
    expect(result.consequenceDisposition).toBe('do_not_reapply')
    expect(createProcedureExecutionReceipt(receiptKey, 'fingerprint', true).executionKey).toBe(
      'operation'
    )
  })

  it('does not suppress a different execution key or an uncommitted receipt', () => {
    const input = makeInput()
    const result = executeCanonicalProcedureThroughCrossRoleAction({
      ...input,
      priorReceipts: [
        createProcedureExecutionReceipt('another_operation', 'fingerprint', true),
        createProcedureExecutionReceipt(input.executionKey, 'fingerprint', false),
      ],
    })
    expect(result.outcome).toBe('executed')
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
    const result = evaluateCanonicalProcedureExecutionReadiness(makeInput({ definition }))

    expect(result.ok).toBe(false)
    expect(result.outcome).toBe('invalid_action_contract')
  })

  it('blocks a forbidden participant while another role lane remains eligible', () => {
    const definition = makeProcedure()
    const result = executeCanonicalProcedureThroughCrossRoleAction(
      makeInput({
        definition: {
          ...definition,
          restrictions: { ...definition.restrictions, forbiddenRoles: ['investigator'] },
        },
      })
    )
    if (result.ok || result.outcome !== 'action_blocked') throw new Error('expected action block')
    expect(result.actionResult).toEqual({
      ok: false,
      outcome: 'ineligible_roles',
      ineligibleRoles: ['investigator'],
    })
  })
})
