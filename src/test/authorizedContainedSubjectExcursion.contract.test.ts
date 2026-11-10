import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import type { AgentRole } from '../domain/agent/models'
import type { CrossRoleActionParticipant } from '../domain/crossRoleActionProcedure'
import {
  BINDING_SIGIL,
  PROCEDURE_DEFINITION_SCHEMA_VERSION,
  type ProcedureDefinition,
} from '../domain/procedureDefinition'
import type { ProcedureExecutionPrerequisiteDecision } from '../domain/procedureToActionAdapter'
import {
  beginAuthorizedExcursionReturn,
  confirmAuthorizedExcursionRecontainment,
  confirmAuthorizedExcursionRelease,
  confirmAuthorizedExcursionReturn,
  createAuthorizedContainedSubjectExcursion,
  evaluateAuthorizedExcursionReturnObligation,
  interruptAuthorizedExcursion,
  parseFacilityAuthorizedContainedSubjectExcursions,
  projectExplainableAuthorizedExcursion,
  reportAuthorizedExcursionMissing,
  runAuthorizedExcursionPreflight,
  type AuthorizedExcursionPreflightGates,
  type AuthorizedExcursionRecord,
} from '../domain/authorizedContainedSubjectExcursion'

const openGates: AuthorizedExcursionPreflightGates = Object.freeze({
  purposeAuthorized: true,
  staffAuthorized: true,
  movementCapabilityValid: true,
  routeAccessible: true,
  permitReady: true,
  roomConfigSafe: true,
})

function makeProcedure(overrides: Partial<ProcedureDefinition> = {}): ProcedureDefinition {
  return {
    ...BINDING_SIGIL,
    schemaVersion: PROCEDURE_DEFINITION_SCHEMA_VERSION,
    procedureId: 'authorized_excursion_release',
    canonicalName: 'Authorized Excursion Release',
    requirements: {
      speech: 'none',
      gesture: 'none',
      toolTags: ['evidence_kit'],
      reagents: [],
      requiresDiagram: false,
      deviceTags: [],
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

function procedureAdapter(executionKey = 'exec-excursion-1') {
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
    executionKey,
  }
}

function createNonPerson(
  overrides: Partial<Parameters<typeof createAuthorizedContainedSubjectExcursion>[0]> = {}
) {
  return createAuthorizedContainedSubjectExcursion({
    excursionId: 'exc-1',
    subjectRef: 'subject:anomaly-a',
    subjectKind: 'non_person',
    originNodeId: 'room:containment_cell',
    originZoneRef: 'zone:containment',
    purposeRef: 'purpose:authorized-interview',
    returnDeadlineWeek: 3,
    operationKey: 'op-create-1',
    ...overrides,
  })
}

function clearOutboundScreen() {
  return {
    direction: 'outbound',
    boundaryZoneId: 'zone:containment',
    actorId: 'subject:anomaly-a',
    policies: [
      {
        policyId: 'policy-clear',
        boundaryZoneId: 'zone:containment',
      },
    ],
  }
}

function holdOutboundScreen() {
  return {
    direction: 'outbound',
    boundaryZoneId: 'zone:containment',
    actorId: 'subject:anomaly-a',
    carriedClasses: ['biohazard_sample'],
    policies: [
      {
        policyId: 'policy-hold',
        boundaryZoneId: 'zone:containment',
        holdCarriedClasses: ['biohazard_sample'],
      },
    ],
  }
}

function runHappyPath(excursion: AuthorizedExcursionRecord): AuthorizedExcursionRecord {
  const preflight = runAuthorizedExcursionPreflight({
    excursion,
    operationKey: 'op-preflight-1',
    gates: openGates,
    procedureAdapter: procedureAdapter(),
    authorizationRef: 'auth:excursion-1',
  })
  expect(preflight.ok).toBe(true)
  const released = confirmAuthorizedExcursionRelease(preflight.excursion!, {
    operationKey: 'op-confirm-release',
    releaseCommitted: true,
    campaignWeek: 1,
  })
  expect(released.ok).toBe(true)
  const returning = beginAuthorizedExcursionReturn(released.excursion!, 'op-begin-return')
  expect(returning.ok).toBe(true)
  const arrived = confirmAuthorizedExcursionReturn(returning.excursion!, {
    operationKey: 'op-confirm-return',
    returnCommitted: true,
    arrivedAtOrigin: true,
  })
  expect(arrived.ok).toBe(true)
  expect(arrived.excursion?.stage).toBe('recontainment_verification')
  const completed = confirmAuthorizedExcursionRecontainment(arrived.excursion!, {
    operationKey: 'op-confirm-recontain',
    recontainmentVerified: true,
    procedureAdapter: procedureAdapter('exec-recontain-1'),
  })
  expect(completed.ok).toBe(true)
  return completed.excursion!
}

describe('SPE-3500 authorized contained-subject excursion', () => {
  it('completes a valid excursion through release, return, and verified recontainment', () => {
    const created = createNonPerson()
    expect(created.ok).toBe(true)
    expect(created.excursion?.stage).toBe('requested')

    const completed = runHappyPath(created.excursion!)
    expect(completed.stage).toBe('completed')
    expect(completed.physicalEffectsOccurred).toBe(true)
    expect(completed.authorizationRef).toBe('auth:excursion-1')
    expect(completed.procedureExecutionKey).toBe('exec-recontain-1')
    expect(completed.custodyStatusId).toBeUndefined()
    expect(projectExplainableAuthorizedExcursion(completed)).toMatchObject({
      stage: 'completed',
      outcome: 'completed',
      physicalEffectsOccurred: true,
      returnDeadlineWeek: 3,
    })
  })

  it('fail-closes unauthorized purpose without physical effects', () => {
    const created = createNonPerson()
    const blocked = runAuthorizedExcursionPreflight({
      excursion: created.excursion!,
      operationKey: 'op-preflight-unauth',
      gates: { ...openGates, purposeAuthorized: false },
    })
    expect(blocked.ok).toBe(false)
    expect(blocked.excursion?.stage).toBe('blocked')
    expect(blocked.reasonCodes).toContain('unauthorized_purpose')
    expect(blocked.excursion?.physicalEffectsOccurred).toBe(false)
  })

  it('fail-closes outbound screening hold during preflight', () => {
    const created = createNonPerson()
    const blocked = runAuthorizedExcursionPreflight({
      excursion: created.excursion!,
      operationKey: 'op-screen-hold',
      gates: { ...openGates, requiresOutboundScreen: true },
      outboundScreen: holdOutboundScreen(),
    })
    expect(blocked.ok).toBe(false)
    expect(blocked.reasonCodes).toContain('outbound_screen_blocked')
    expect(blocked.evidence?.outboundScreen?.decision).toBe('hold')
  })

  it('requires SPE-2995 procedure readiness for recontainment completion', () => {
    const created = createNonPerson()
    const preflight = runAuthorizedExcursionPreflight({
      excursion: created.excursion!,
      operationKey: 'op-preflight-ready',
      gates: { ...openGates, requiresOutboundScreen: true },
      outboundScreen: clearOutboundScreen(),
      procedureAdapter: procedureAdapter(),
    })
    expect(preflight.ok).toBe(true)
    const released = confirmAuthorizedExcursionRelease(preflight.excursion!, {
      operationKey: 'op-release',
      releaseCommitted: true,
      campaignWeek: 1,
    })
    const returning = beginAuthorizedExcursionReturn(released.excursion!, 'op-return')
    const arrived = confirmAuthorizedExcursionReturn(returning.excursion!, {
      operationKey: 'op-arrive',
      returnCommitted: true,
      arrivedAtOrigin: true,
    })
    const notReady = confirmAuthorizedExcursionRecontainment(arrived.excursion!, {
      operationKey: 'op-recontain-blocked',
      recontainmentVerified: true,
      procedureAdapter: {
        ...procedureAdapter('exec-blocked'),
        prerequisiteDecisions: baseDecisions.map((decision) =>
          decision.prerequisiteClass === 'authorization'
            ? { ...decision, state: 'blocked', reason: 'missing_auth' }
            : decision
        ),
      },
    })
    expect(notReady.ok).toBe(false)
    expect(notReady.code).toBe('procedure_not_ready')
    expect(arrived.excursion?.stage).toBe('recontainment_verification')
  })

  it('produces return_due then overdue from canonical campaign weeks without asserting escape', () => {
    const created = createNonPerson({ returnDeadlineWeek: 2 })
    const preflight = runAuthorizedExcursionPreflight({
      excursion: created.excursion!,
      operationKey: 'op-preflight',
      gates: openGates,
      procedureAdapter: procedureAdapter(),
    })
    const released = confirmAuthorizedExcursionRelease(preflight.excursion!, {
      operationKey: 'op-release',
      releaseCommitted: true,
      campaignWeek: 1,
    })
    const due = evaluateAuthorizedExcursionReturnObligation(released.excursion!, {
      operationKey: 'op-due',
      campaignWeek: 2,
    })
    expect(due.ok).toBe(true)
    expect(due.excursion?.stage).toBe('return_due')
    const overdue = evaluateAuthorizedExcursionReturnObligation(due.excursion!, {
      operationKey: 'op-overdue',
      campaignWeek: 3,
    })
    expect(overdue.ok).toBe(true)
    expect(overdue.excursion?.stage).toBe('overdue')
    expect(overdue.excursion?.reasonCodes).toContain('deadline_exceeded')
    expect(overdue.excursion?.responseOwnerHint).toBe('response')
    expect(projectExplainableAuthorizedExcursion(overdue.excursion!)).toMatchObject({
      outcome: 'overdue',
      returnDeadlineWeek: 2,
    })
  })

  it('routes disappearance to tracking/response owners without inventing escape', () => {
    const created = createNonPerson()
    const preflight = runAuthorizedExcursionPreflight({
      excursion: created.excursion!,
      operationKey: 'op-preflight',
      gates: openGates,
    })
    const released = confirmAuthorizedExcursionRelease(preflight.excursion!, {
      operationKey: 'op-release',
      releaseCommitted: true,
      campaignWeek: 1,
    })
    const missing = reportAuthorizedExcursionMissing(released.excursion!, {
      operationKey: 'op-missing',
      responseOwnerHint: 'tracking',
    })
    expect(missing.ok).toBe(true)
    expect(missing.excursion?.stage).toBe('missing')
    expect(missing.excursion?.responseOwnerHint).toBe('tracking')

    const second = createNonPerson({ excursionId: 'exc-missing-2', operationKey: 'op-c-m2' })
    const preflight2 = runAuthorizedExcursionPreflight({
      excursion: second.excursion!,
      operationKey: 'op-pf-m2',
      gates: openGates,
    })
    const released2 = confirmAuthorizedExcursionRelease(preflight2.excursion!, {
      operationKey: 'op-rel-m2',
      releaseCommitted: true,
      campaignWeek: 1,
    })
    const overdue = evaluateAuthorizedExcursionReturnObligation(released2.excursion!, {
      operationKey: 'op-od-m2',
      campaignWeek: 4,
    })
    expect(overdue.excursion?.stage).toBe('overdue')
    const retrieval = reportAuthorizedExcursionMissing(overdue.excursion!, {
      operationKey: 'op-retrieval',
      escalateToRetrieval: true,
    })
    expect(retrieval.ok).toBe(true)
    expect(retrieval.excursion?.stage).toBe('retrieval_required')
  })

  it('does not complete on physical arrival alone', () => {
    const created = createNonPerson()
    const preflight = runAuthorizedExcursionPreflight({
      excursion: created.excursion!,
      operationKey: 'op-preflight',
      gates: openGates,
    })
    const released = confirmAuthorizedExcursionRelease(preflight.excursion!, {
      operationKey: 'op-release',
      releaseCommitted: true,
      campaignWeek: 1,
    })
    const returning = beginAuthorizedExcursionReturn(released.excursion!, 'op-return')
    const arrived = confirmAuthorizedExcursionReturn(returning.excursion!, {
      operationKey: 'op-arrive',
      returnCommitted: true,
      arrivedAtOrigin: true,
    })
    expect(arrived.excursion?.stage).toBe('recontainment_verification')
    const failed = confirmAuthorizedExcursionRecontainment(arrived.excursion!, {
      operationKey: 'op-fail-recontain',
      recontainmentVerified: false,
      procedureAdapter: {
        ...procedureAdapter('exec-not-ready'),
        prerequisiteDecisions: baseDecisions.map((decision) =>
          decision.prerequisiteClass === 'authorization'
            ? { ...decision, state: 'blocked', reason: 'missing_auth' }
            : decision
        ),
      },
    })
    expect(failed.ok).toBe(false)
    expect(failed.excursion?.stage).toBe('failed_return')
    expect(failed.reasonCodes).toContain('recontainment_not_verified')
    expect(failed.code).toBe('recontainment_not_verified')
  })

  it('preserves person custody identity refs across release and hydrate', () => {
    const created = createAuthorizedContainedSubjectExcursion(
      {
        excursionId: 'exc-person',
        subjectRef: 'subject:person-1',
        subjectKind: 'person',
        originNodeId: 'room:holding',
        purposeRef: 'purpose:medical-eval',
        custodyStatusId: 'custody:person-1',
        formerRoleCategory: 'civilian',
        returnDeadlineWeek: 4,
        operationKey: 'op-create-person',
      },
      createStartingState()
    )
    expect(created.ok).toBe(true)
    const preflight = runAuthorizedExcursionPreflight(
      {
        excursion: created.excursion!,
        operationKey: 'op-preflight-person',
        gates: openGates,
      },
      created.state
    )
    const released = confirmAuthorizedExcursionRelease(
      preflight.excursion!,
      {
        operationKey: 'op-release-person',
        releaseCommitted: true,
        campaignWeek: 2,
      },
      preflight.state
    )
    expect(released.excursion?.custodyStatusId).toBe('custody:person-1')
    expect(released.excursion?.formerRoleCategory).toBe('civilian')
    expect(
      released.state?.facilityAuthorizedContainedSubjectExcursions?.['exc-person']?.custodyStatusId
    ).toBe('custody:person-1')

    const hydrated = hydrateGame(structuredClone(released.state!))
    expect(
      hydrated.facilityAuthorizedContainedSubjectExcursions?.['exc-person']?.custodyStatusId
    ).toBe('custody:person-1')
    expect(
      hydrated.facilityAuthorizedContainedSubjectExcursions?.['exc-person']?.formerRoleCategory
    ).toBe('civilian')
  })

  it('rejects smuggled person-custody fields on non-person subjects', () => {
    const created = createAuthorizedContainedSubjectExcursion({
      excursionId: 'exc-bad',
      subjectRef: 'subject:anomaly-b',
      subjectKind: 'non_person',
      originNodeId: 'room:containment_cell',
      purposeRef: 'purpose:x',
      custodyStatusId: 'custody:should-not',
      formerRoleCategory: 'civilian',
      operationKey: 'op-bad',
    })
    expect(created.ok).toBe(false)
    expect(created.code).toBe('malformed_input')
  })

  it('is idempotent on replayed operation keys and fail-closes stale keys', () => {
    const base = createStartingState()
    const first = createAuthorizedContainedSubjectExcursion(
      {
        excursionId: 'exc-idem',
        subjectRef: 'subject:anomaly-c',
        subjectKind: 'non_person',
        originNodeId: 'room:containment_cell',
        purposeRef: 'purpose:y',
        operationKey: 'op-create-same',
      },
      base
    )
    expect(first.ok).toBe(true)
    const replay = createAuthorizedContainedSubjectExcursion(
      {
        excursionId: 'exc-idem',
        subjectRef: 'subject:anomaly-c',
        subjectKind: 'non_person',
        originNodeId: 'room:containment_cell',
        purposeRef: 'purpose:y',
        operationKey: 'op-create-same',
      },
      first.state
    )
    expect(replay.ok).toBe(true)
    expect(replay.excursion?.appliedOperationKeys).toEqual(['op-create-same'])
    const stale = createAuthorizedContainedSubjectExcursion(
      {
        excursionId: 'exc-idem',
        subjectRef: 'subject:anomaly-c',
        subjectKind: 'non_person',
        originNodeId: 'room:containment_cell',
        purposeRef: 'purpose:y',
        operationKey: 'op-create-other',
      },
      first.state
    )
    expect(stale.ok).toBe(false)
    expect(stale.code).toBe('stale_operation')
  })

  it('aborts pre-release cleanly and fails post-release without rollback', () => {
    const created = createNonPerson()
    const aborted = interruptAuthorizedExcursion(created.excursion!, {
      operationKey: 'op-abort',
    })
    expect(aborted.ok).toBe(false)
    expect(aborted.excursion?.stage).toBe('aborted')
    expect(aborted.excursion?.physicalEffectsOccurred).toBe(false)

    const preflight = runAuthorizedExcursionPreflight({
      excursion: createNonPerson({ excursionId: 'exc-2', operationKey: 'op-c2' }).excursion!,
      operationKey: 'op-pf2',
      gates: openGates,
    })
    const released = confirmAuthorizedExcursionRelease(preflight.excursion!, {
      operationKey: 'op-rel2',
      releaseCommitted: true,
      campaignWeek: 1,
    })
    const failed = interruptAuthorizedExcursion(released.excursion!, {
      operationKey: 'op-interrupt',
      responseOwnerHint: 'incident',
    })
    expect(failed.ok).toBe(false)
    expect(failed.excursion?.stage).toBe('failed_return')
    expect(failed.excursion?.physicalEffectsOccurred).toBe(true)
  })

  it('parses durable registry and drops malformed siblings independently', () => {
    const parsed = parseFacilityAuthorizedContainedSubjectExcursions({
      'exc-a': {
        excursionId: 'exc-a',
        subjectRef: 'subject:a',
        subjectKind: 'non_person',
        originNodeId: 'room:a',
        purposeRef: 'purpose:a',
        stage: 'completed',
        reasonCodes: [],
        appliedOperationKeys: ['op-a'],
        physicalEffectsOccurred: true,
        startWeek: 1,
      },
      'exc-bad': { excursionId: 'wrong-id' },
    })
    expect(parsed).toBeDefined()
    expect(Object.keys(parsed!)).toEqual(['exc-a'])
    expect(Object.isFrozen(parsed)).toBe(true)
  })

  it('rejects hydrate records that violate stage evidence invariants', () => {
    const base = {
      subjectRef: 'subject:a',
      subjectKind: 'non_person' as const,
      originNodeId: 'room:a',
      purposeRef: 'purpose:a',
      appliedOperationKeys: ['op-a'],
    }
    const parsed = parseFacilityAuthorizedContainedSubjectExcursions({
      'exc-completed-no-effects': {
        ...base,
        excursionId: 'exc-completed-no-effects',
        stage: 'completed',
        reasonCodes: [],
        physicalEffectsOccurred: false,
        startWeek: 1,
      },
      'exc-active-no-start': {
        ...base,
        excursionId: 'exc-active-no-start',
        stage: 'active_excursion',
        reasonCodes: [],
        physicalEffectsOccurred: true,
      },
      'exc-failed-no-reason': {
        ...base,
        excursionId: 'exc-failed-no-reason',
        stage: 'failed_return',
        reasonCodes: [],
        physicalEffectsOccurred: true,
        startWeek: 1,
      },
      'exc-requested-effects': {
        ...base,
        excursionId: 'exc-requested-effects',
        stage: 'requested',
        reasonCodes: [],
        physicalEffectsOccurred: true,
      },
      'exc-overdue-no-deadline': {
        ...base,
        excursionId: 'exc-overdue-no-deadline',
        stage: 'overdue',
        reasonCodes: ['deadline_exceeded'],
        physicalEffectsOccurred: true,
        startWeek: 1,
      },
      'exc-valid-blocked': {
        ...base,
        excursionId: 'exc-valid-blocked',
        stage: 'blocked',
        reasonCodes: ['outbound_screen_blocked'],
        physicalEffectsOccurred: false,
      },
    })
    expect(parsed).toBeDefined()
    expect(Object.keys(parsed!)).toEqual(['exc-valid-blocked'])
  })
})
