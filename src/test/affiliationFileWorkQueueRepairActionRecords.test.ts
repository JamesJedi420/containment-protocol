import { describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { createStartingState } from '../data/startingState'
import { COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE } from '../domain/affiliationPersonStatusRecords'
import { buildAffiliationFileWorkQueueEvidenceResolutionRecord } from '../domain/affiliationFileWorkQueueEvidenceResolutionRecords'
import {
  applyAffiliationFileWorkQueueEvidenceRepair,
  buildAffiliationFileWorkQueueRepairActionRecord,
  buildAffiliationFileWorkQueueRepairActionRecordId,
  sanitizeAffiliationFileWorkQueueRepairActionRecords,
} from '../domain/affiliationFileWorkQueueRepairActionRecords'
import { validateEntityWelfareReclassificationRecord } from '../domain/entityWelfareReclassificationRegistry'

describe('affiliationFileWorkQueueRepairActionRecords persistence', () => {
  it('builds deterministic ids from work queue entry and missing reason code', () => {
    const record = buildAffiliationFileWorkQueueRepairActionRecord({
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      reasonCode: ' missing_candidate_ref ',
      repairLabel: 'Candidate link repair',
      recordedWeek: 7,
    })

    expect(record).toEqual({
      id: 'affiliation-file-repair-action:person-status:alpha:missing_candidate_ref',
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      reasonCode: 'missing_candidate_ref',
      repairLabel: 'Candidate link repair',
      recordedWeek: 7,
    })
    expect(
      buildAffiliationFileWorkQueueRepairActionRecordId({
        workQueueEntryId: 'person-status:alpha',
        reasonCode: 'missing_candidate_ref',
      })
    ).toBe(record.id)
  })

  it('drops invalid records and mismatched keys during hydration sanitization', () => {
    const valid = buildAffiliationFileWorkQueueRepairActionRecord({
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      reasonCode: 'missing_candidate_ref',
      repairLabel: 'Candidate link repair',
      recordedWeek: 3,
    })

    expect(
      sanitizeAffiliationFileWorkQueueRepairActionRecords({
        [valid.id]: valid,
        'wrong-key': valid,
        'bad-reason': {
          ...valid,
          id: 'affiliation-file-repair-action:person-status:beta:file_restricted',
          workQueueEntryId: 'person-status:beta',
          reasonCode: 'file_restricted',
        },
        'bad-week': {
          ...valid,
          id: 'affiliation-file-repair-action:person-status:gamma:missing_candidate_ref',
          workQueueEntryId: 'person-status:gamma',
          recordedWeek: 1.5,
        },
      })
    ).toEqual({
      [valid.id]: valid,
    })
  })

  it('hydrates and exports repair-action records through GameState without mutating person-status records', () => {
    const state = createStartingState()
    const valid = buildAffiliationFileWorkQueueRepairActionRecord({
      workQueueEntryId: 'person-status:alpha',
      subjectId: 'subject:alpha',
      subjectLabel: 'Alpha Subject',
      reasonCode: 'missing_candidate_ref',
      repairLabel: 'Candidate link repair',
      recordedWeek: 5,
    })

    state.affiliationFileWorkQueueRepairActionRecords = {
      [valid.id]: valid,
    }

    const hydrated = hydrateGame(JSON.parse(JSON.stringify(state)), createStartingState())

    expect(hydrated.affiliationFileWorkQueueRepairActionRecords).toEqual({
      [valid.id]: valid,
    })
    expect(hydrated.affiliationPersonStatusRecords).toEqual({})
  })

  it('restores minimal valid welfare evidence for resolved welfare-link repairs', () => {
    const state = createStartingState()
    state.week = 13
    state.affiliationPersonStatusRecords = {
      'person-status:welfare-missing': {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        id: 'person-status:welfare-missing',
        subjectId: 'subject:welfare-missing',
        subjectLabel: 'Welfare Missing Subject',
        entityWelfareReclassificationRef: 'reclass:welfare-missing',
      },
    }
    const resolution = buildAffiliationFileWorkQueueEvidenceResolutionRecord({
      workQueueEntryId: 'person-status:welfare-missing',
      subjectId: 'subject:welfare-missing',
      subjectLabel: 'Welfare Missing Subject',
      sourceBucket: 'missing_review',
      missingReasonCodes: ['missing_entity_welfare_reclassification_ref'],
      recordedWeek: 12,
    })
    state.affiliationFileWorkQueueEvidenceResolutionRecords = {
      [resolution.id]: resolution,
    }

    const result = applyAffiliationFileWorkQueueEvidenceRepair({
      state,
      workQueueEntryId: 'person-status:welfare-missing',
      reasonCode: 'missing_entity_welfare_reclassification_ref',
      recordedWeek: 13,
    })
    const restored = result.state.entityWelfareReclassificationRecords?.['reclass:welfare-missing']

    expect(result).toMatchObject({ applied: true, reason: 'applied' })
    expect(restored).toMatchObject({
      id: 'reclass:welfare-missing',
      label: 'Welfare Missing Subject welfare link repair',
      priorThreatLabel: 'unreviewed affiliation custody',
      proposedDisposition: 'unknown',
      reclassificationState: 'pending',
      confidence: 0.5,
    })
    expect(restored?.evidenceBundleRefs).toEqual([
      'affiliation-file-work-queue-repair:reclass:welfare-missing:week-13',
    ])
    expect(restored ? validateEntityWelfareReclassificationRecord(restored).valid : false).toBe(
      true
    )
    expect(result.state.affiliationPersonStatusRecords).toBe(state.affiliationPersonStatusRecords)
  })

  it('repairs onboarding evidence from canonical candidates when the legacy recruitment pool is empty', () => {
    const state = createStartingState()
    state.week = 13
    state.candidates = [
      {
        id: 'candidate:onboarding-canonical',
        name: 'Canonical Onboarding Subject',
        age: 30,
        category: 'agent',
        hireStatus: 'available',
        weeklyCost: 0,
        weeklyWage: 0,
        revealLevel: 1,
        funnelStage: 'screening',
      },
    ]
    state.recruitmentPool = []
    state.affiliationPersonStatusRecords = {
      'person-status:onboarding-canonical': {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        id: 'person-status:onboarding-canonical',
        subjectId: 'subject:onboarding-canonical',
        subjectLabel: 'Canonical Onboarding Subject',
        candidateRef: 'candidate:onboarding-canonical',
        backgroundCleared: undefined,
        trainingCompleted: undefined,
        oathContractSigned: undefined,
      },
    }
    const resolution = buildAffiliationFileWorkQueueEvidenceResolutionRecord({
      workQueueEntryId: 'person-status:onboarding-canonical',
      subjectId: 'subject:onboarding-canonical',
      subjectLabel: 'Canonical Onboarding Subject',
      sourceBucket: 'missing_review',
      missingReasonCodes: ['missing_onboarding_clearance'],
      recordedWeek: 12,
    })
    state.affiliationFileWorkQueueEvidenceResolutionRecords = {
      [resolution.id]: resolution,
    }

    const result = applyAffiliationFileWorkQueueEvidenceRepair({
      state,
      workQueueEntryId: 'person-status:onboarding-canonical',
      reasonCode: 'missing_onboarding_clearance',
      recordedWeek: 13,
    })

    expect(result).toMatchObject({ applied: true, reason: 'applied' })
    expect(
      result.state.affiliationPersonStatusRecords?.['person-status:onboarding-canonical']
    ).toMatchObject({
      candidateRef: 'candidate:onboarding-canonical',
      backgroundCleared: true,
      trainingCompleted: true,
      oathContractSigned: true,
    })
    expect(result.state.candidates[0]).toMatchObject({
      id: 'candidate:onboarding-canonical',
      revealLevel: 2,
      funnelStage: 'hired',
      lastUpdatedWeek: 13,
    })
  })

  it('preserves the full legacy candidate pool when onboarding repair promotes legacy candidates', () => {
    const state = createStartingState()
    state.week = 13
    state.candidates = []
    state.recruitmentPool = [
      {
        id: 'candidate:legacy-repair',
        name: 'Legacy Repair Subject',
        age: 30,
        category: 'agent',
        hireStatus: 'available',
        weeklyCost: 0,
        weeklyWage: 0,
        revealLevel: 1,
        funnelStage: 'screening',
      },
      {
        id: 'candidate:legacy-other',
        name: 'Other Legacy Subject',
        age: 31,
        category: 'agent',
        hireStatus: 'available',
        weeklyCost: 0,
        weeklyWage: 0,
        revealLevel: 2,
      },
    ]
    state.affiliationPersonStatusRecords = {
      'person-status:legacy-repair': {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        id: 'person-status:legacy-repair',
        subjectId: 'subject:legacy-repair',
        subjectLabel: 'Legacy Repair Subject',
        candidateRef: 'candidate:legacy-repair',
        backgroundCleared: undefined,
        trainingCompleted: undefined,
        oathContractSigned: undefined,
      },
    }
    const resolution = buildAffiliationFileWorkQueueEvidenceResolutionRecord({
      workQueueEntryId: 'person-status:legacy-repair',
      subjectId: 'subject:legacy-repair',
      subjectLabel: 'Legacy Repair Subject',
      sourceBucket: 'missing_review',
      missingReasonCodes: ['missing_onboarding_clearance'],
      recordedWeek: 12,
    })
    state.affiliationFileWorkQueueEvidenceResolutionRecords = {
      [resolution.id]: resolution,
    }

    const result = applyAffiliationFileWorkQueueEvidenceRepair({
      state,
      workQueueEntryId: 'person-status:legacy-repair',
      reasonCode: 'missing_onboarding_clearance',
      recordedWeek: 13,
    })

    expect(result).toMatchObject({ applied: true, reason: 'applied' })
    expect(result.state.candidates.map((candidate) => candidate.id)).toEqual([
      'candidate:legacy-repair',
      'candidate:legacy-other',
    ])
    expect(result.state.recruitmentPool).toEqual(result.state.candidates)
  })

  it('does not repair onboarding evidence from stale legacy candidates when canonical candidates are present', () => {
    const state = createStartingState()
    state.week = 13
    state.candidates = [
      {
        id: 'candidate:other-canonical',
        name: 'Other Canonical Subject',
        age: 30,
        category: 'agent',
        hireStatus: 'available',
        weeklyCost: 0,
        weeklyWage: 0,
        revealLevel: 2,
      },
    ]
    state.recruitmentPool = [
      {
        id: 'candidate:stale-legacy',
        name: 'Stale Legacy Subject',
        age: 30,
        category: 'agent',
        hireStatus: 'available',
        weeklyCost: 0,
        weeklyWage: 0,
        revealLevel: 1,
        funnelStage: 'screening',
      },
    ]
    state.affiliationPersonStatusRecords = {
      'person-status:stale-legacy': {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        id: 'person-status:stale-legacy',
        subjectId: 'subject:stale-legacy',
        subjectLabel: 'Stale Legacy Subject',
        candidateRef: 'candidate:stale-legacy',
        backgroundCleared: undefined,
        trainingCompleted: undefined,
        oathContractSigned: undefined,
      },
    }
    const resolution = buildAffiliationFileWorkQueueEvidenceResolutionRecord({
      workQueueEntryId: 'person-status:stale-legacy',
      subjectId: 'subject:stale-legacy',
      subjectLabel: 'Stale Legacy Subject',
      sourceBucket: 'missing_review',
      missingReasonCodes: ['missing_onboarding_clearance'],
      recordedWeek: 12,
    })
    state.affiliationFileWorkQueueEvidenceResolutionRecords = {
      [resolution.id]: resolution,
    }

    const result = applyAffiliationFileWorkQueueEvidenceRepair({
      state,
      workQueueEntryId: 'person-status:stale-legacy',
      reasonCode: 'missing_onboarding_clearance',
      recordedWeek: 13,
    })

    expect(result).toMatchObject({ applied: false, reason: 'missing-candidate-ref' })
    expect(result.state).toBe(state)
  })
})
