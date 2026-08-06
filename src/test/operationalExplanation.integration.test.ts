import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { BIOHAZARD_RESPONSE_FACILITY_ID } from '../domain/departmentWorkshopFacilityMapping'
import {
  composeDeployableReadiness,
  type ReadinessCompositionRecord,
} from '../domain/deployableReadiness'
import {
  createOperationalExplanationId,
  createOperationalExplanationRecord,
  projectOperationalExplanation,
  sortOperationalExplanationRecords,
  validateOperationalExplanationRecord,
  validateOperationalExplanationRegistry,
} from '../domain/operationalExplanation'
import type { FacilityStatus, GameState } from '../domain/models'
import { getDepartmentWorkshopOperationalExplanations } from '../features/operations/departmentWorkshopExplanationAdapter'
import { getDepartmentWorkshopMirrorView } from '../features/operations/departmentWorkshopMirrorView'
import { getDeployableReadinessOperationalExplanation } from '../features/operations/deployableReadinessExplanationAdapter'

const DEPARTMENT_ID = 'department:biohazard-response'
const WORK_ORDER_ID = 'work:explanation-room-quality'

function makeFacility(status: FacilityStatus) {
  return {
    facilityId: BIOHAZARD_RESPONSE_FACILITY_ID,
    category: 'biohazard_response_lab',
    level: 1,
    maxLevel: 3,
    status,
    effects: {},
  }
}

function makeWorkshopState(status?: FacilityStatus): GameState {
  const state = createStartingState()
  state.facilityState = {
    facilities: status
      ? { [BIOHAZARD_RESPONSE_FACILITY_ID]: makeFacility(status) }
      : {},
  }
  state.departmentWorkshopWorkOrders = {
    [WORK_ORDER_ID]: {
      id: WORK_ORDER_ID,
      departmentId: DEPARTMENT_ID,
      caseId: 'case-001',
      taskType: 'research_case',
      requiredWork: 2,
    },
  }
  state.departmentWorkshopSnapshots = {
    [DEPARTMENT_ID]: {
      departmentId: DEPARTMENT_ID,
      slotCapacity: 1,
      queued: [],
      active: [{ workOrderId: WORK_ORDER_ID, completedWork: 1 }],
      paused: [],
    },
  }
  state.departmentWorkshopCompletionOutcomes = {}
  return state
}

describe('shared operational explanation contract', () => {
  it('builds stable IDs, normalized arrays, deterministic ordering, and consistent depths', () => {
    const active = createOperationalExplanationRecord({
      source: {
        system: 'department_workshop',
        recordType: 'work_order',
        recordId: 'work:b',
      },
      subjectId: 'work:b',
      reasonCode: 'department_workshop.reason',
      severity: 'degraded',
      lifecycle: 'active',
      summary: 'Visible reason',
      cause: 'Cause',
      currentEffect: 'Effect',
      confidence: 'confirmed',
      provenance: ['z', 'a', 'a'],
      blockerCodes: ['b', 'a', 'a'],
    })
    const resolved = createOperationalExplanationRecord({
      source: { system: 'department_workshop', recordType: 'completion_outcome', recordId: 'a' },
      subjectId: 'a',
      reasonCode: 'department_workshop.reason',
      severity: 'critical',
      lifecycle: 'resolved',
      summary: 'Resolved reason',
      cause: 'Cause',
      currentEffect: 'Effect',
      confidence: 'supported',
    })

    expect(active.id).toBe(
      'department_workshop:work_order:work%3Ab:department_workshop.reason'
    )
    expect(
      createOperationalExplanationId(
        { system: 'department_workshop', recordType: 'work_order', recordId: 'a:b' },
        'c.d'
      )
    ).not.toBe(
      createOperationalExplanationId(
        { system: 'department_workshop', recordType: 'work_order', recordId: 'a' },
        'b:c.d'
      )
    )
    expect(active.provenance).toEqual(['a', 'z'])
    expect(active.blockerCodes).toEqual(['a', 'b'])
    expect(sortOperationalExplanationRecords([resolved, active]).map((item) => item.id)).toEqual([
      active.id,
      resolved.id,
    ])

    const summary = projectOperationalExplanation(active, 'summary')
    const detail = projectOperationalExplanation(active, 'detail')
    const diagnostic = projectOperationalExplanation(active, 'diagnostic')
    expect(summary.reasonText).toContain('degraded')
    expect(detail.reasonCode).toBe(summary.reasonCode)
    expect(diagnostic.source).toEqual(summary.source)
    expect(diagnostic.provenance).toEqual(active.provenance)
    expect(validateOperationalExplanationRecord(active).valid).toBe(true)
    expect(validateOperationalExplanationRegistry([active, active]).issues).toContain('1:duplicate-id')
  })

  it('rejects malformed or tampered records', () => {
    const record = createOperationalExplanationRecord({
      source: { system: 'deployable_readiness', recordType: 'readiness_composition', recordId: 'unit' },
      subjectId: 'unit',
      reasonCode: 'deployable_readiness.ready',
      severity: 'routine',
      lifecycle: 'active',
      summary: 'Ready',
      cause: 'Validated inputs',
      currentEffect: 'Reliable',
      confidence: 'confirmed',
    })
    expect(validateOperationalExplanationRecord({ ...record, id: 'tampered' }).issues).toContain(
      'id-mismatch'
    )
    expect(
      validateOperationalExplanationRecord({ ...record, provenance: ['z', 'a'] }).issues
    ).toContain('provenance-not-normalized')
  })
})

describe('department workshop explanation adapter', () => {
  it('reconstructs active poor-room degradation, removes it when active, and exposes mirror text', () => {
    const poorState = makeWorkshopState('inactive')
    const poor = getDepartmentWorkshopOperationalExplanations(poorState)
    expect(poor).toHaveLength(1)
    expect(poor[0]).toMatchObject({
      subjectId: WORK_ORDER_ID,
      reasonCode: 'department_workshop.poor_room_contamination',
      severity: 'degraded',
      lifecycle: 'active',
    })
    expect(getDepartmentWorkshopOperationalExplanations(makeWorkshopState('active'))).toEqual([])

    const mirror = getDepartmentWorkshopMirrorView(poorState)
    expect(mirror.explanations).toHaveLength(1)
    expect(mirror.explanations[0].summary.reasonText).toContain('Room contamination')
    expect(mirror.explanations[0].detail.currentEffect).toContain('at risk')
    expect(getDepartmentWorkshopMirrorView(poorState).explanations).toEqual(mirror.explanations)
  })

  it('reconstructs ongoing and resolved lifecycle only from authoritative workshop state', () => {
    const state = makeWorkshopState()

    const ongoingExplanations = getDepartmentWorkshopOperationalExplanations(state)
    expect(ongoingExplanations.filter((item) => item.lifecycle === 'active')).toHaveLength(1)
    expect(ongoingExplanations.filter((item) => item.lifecycle === 'resolved')).toHaveLength(0)

    state.departmentWorkshopCompletionOutcomes = {
      [WORK_ORDER_ID]: {
        workOrderId: WORK_ORDER_ID,
        departmentId: DEPARTMENT_ID,
        caseId: 'case-001',
        taskType: 'research_case',
        completedWeek: 2,
        quality: 'degraded',
        qualityReason: 'poor_room_contamination',
        safety: 'safe',
      },
    }
    const completedExplanations = getDepartmentWorkshopOperationalExplanations(state)
    expect(completedExplanations.filter((item) => item.lifecycle === 'active')).toHaveLength(0)
    expect(completedExplanations.filter((item) => item.lifecycle === 'resolved')).toHaveLength(1)
  })
})

describe('deployable readiness explanation adapter', () => {
  it.each([
    [
      'ready',
      composeDeployableReadiness('ready-unit', {
        certificationState: 'certified',
        gearTier: 'legendary',
        conditionBand: 'steady',
      }),
    ],
    [
      'limited',
      composeDeployableReadiness('limited-unit', {
        certificationState: 'eligible_review',
        gearTier: 'rare',
        conditionBand: 'steady',
      }),
    ],
    [
      'degraded',
      composeDeployableReadiness('degraded-unit', {
        certificationState: 'in_progress',
        gearTier: 'rare',
        conditionBand: 'steady',
      }),
    ],
    [
      'blocked',
      composeDeployableReadiness('blocked-unit', {
        certificationState: null,
        gearTier: 'basic',
        conditionBand: 'steady',
      }),
    ],
  ] as const)('maps %s readiness through the shared contract', (_band, source) => {
    const explanation = getDeployableReadinessOperationalExplanation(source)
    expect(validateOperationalExplanationRecord(explanation).valid).toBe(true)
    expect(explanation.source.recordType).toBe('readiness_composition')
    expect(explanation.projectedConsequence).toBeUndefined()
    expect(explanation.currentEffect).toContain('does not determine mission suitability')
  })

  it('preserves stable missing-input blockers and rejects tampered source records', () => {
    const missing = composeDeployableReadiness('missing-unit', {
      certificationState: null,
      gearTier: null,
      conditionBand: null,
    })
    expect(getDeployableReadinessOperationalExplanation(missing).blockerCodes).toEqual([
      'deployable_readiness.missing_certification',
      'deployable_readiness.missing_condition',
      'deployable_readiness.missing_gear',
    ])

    const tampered: ReadinessCompositionRecord = {
      ...composeDeployableReadiness('tampered-unit', {
        certificationState: 'certified',
        gearTier: 'legendary',
        conditionBand: 'steady',
      }),
      fieldReliabilityScore: 1,
    }
    expect(() => getDeployableReadinessOperationalExplanation(tampered)).toThrow(
      'Invalid readiness composition record'
    )
  })
})
