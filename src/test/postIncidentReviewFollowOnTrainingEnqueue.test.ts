import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  POST_INCIDENT_REVIEW_STUB_REGISTRY,
  RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
} from '../domain/postIncidentReviewRegistry'
import {
  applyWeeklyPostIncidentReviewFollowOnArtifactTick,
  FOLLOW_ON_TRAINING_REF_PREFIX,
} from '../domain/postIncidentReviewFollowOnArtifact'
import {
  applyWeeklyPostIncidentReviewFollowOnTrainingEnqueueTick,
  extractFollowOnTrainingRefFromUnknownFields,
  parseFollowOnTrainingRefToken,
} from '../domain/postIncidentReviewFollowOnTrainingEnqueue'
import {
  applyWeeklyPostIncidentReviewCreationTick,
  type QualifyingIncidentReviewDraft,
} from '../domain/postIncidentReviewWeeklyOrchestration'

function stateReadyForThreatAssessmentEnqueue() {
  return {
    ...createStartingState(),
    academyTier: 1,
    funding: 200,
  }
}

describe('postIncidentReviewFollowOnTrainingEnqueue (SPE-868 slice 13)', () => {
  const caseCloseoutDraft: QualifyingIncidentReviewDraft = {
    reviewRef: 'review:case-case-major-closeout',
    caseId: 'case-major',
    caseTitle: 'District breach',
    trigger: 'case_resolved',
    stage: 4,
    kind: 'standard',
    anchorWeek: 12,
  }

  const nearCatastropheDraft: QualifyingIncidentReviewDraft = {
    reviewRef: 'review:near-catastrophe-case-major',
    caseId: 'case-major',
    caseTitle: 'District breach',
    trigger: 'near_catastrophe_threshold',
    stage: 4,
    kind: 'raid',
    anchorWeek: 12,
  }

  it('parses catalog-valid training refs and rejects unknown ids', () => {
    expect(
      parseFollowOnTrainingRefToken(`${FOLLOW_ON_TRAINING_REF_PREFIX}threat-assessment`)
    ).toBe('threat-assessment')
    expect(parseFollowOnTrainingRefToken(`${FOLLOW_ON_TRAINING_REF_PREFIX}missing-program`)).toBeUndefined()
    expect(parseFollowOnTrainingRefToken('follow_on:recommendation-stub:case-major')).toBeUndefined()
  })

  it('extracts training refs from unknownFields and ignores recommendation stubs', () => {
    expect(
      extractFollowOnTrainingRefFromUnknownFields([
        'follow_on:training-ref:threat-assessment',
        'orchestration_week:12',
      ])
    ).toBe('threat-assessment')
    expect(
      extractFollowOnTrainingRefFromUnknownFields([
        'follow_on:recommendation-stub:near-catastrophe-case-major',
        'orchestration_week:12',
      ])
    ).toBeUndefined()
  })

  it('enqueues threat assessment when a qualifying closeout review materializes', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const created = applyWeeklyPostIncidentReviewCreationTick(prior, {}, 12, [caseCloseoutDraft])
    const withArtifact = applyWeeklyPostIncidentReviewFollowOnArtifactTick(prior, created)
    const next = applyWeeklyPostIncidentReviewFollowOnTrainingEnqueueTick(
      stateReadyForThreatAssessmentEnqueue(),
      prior,
      withArtifact
    )

    expect(next.trainingQueue).toHaveLength(1)
    expect(next.trainingQueue[0]?.trainingId).toBe('threat-assessment')
    expect(next.trainingQueue[0]?.agentId).toBe('a_ava')
    expect(next.events.some((event) => event.type === 'agent.training_started')).toBe(true)
  })

  it('is idempotent when re-run for the same materialized review', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const created = applyWeeklyPostIncidentReviewCreationTick(prior, {}, 12, [caseCloseoutDraft])
    const withArtifact = applyWeeklyPostIncidentReviewFollowOnArtifactTick(prior, created)
    const baseState = stateReadyForThreatAssessmentEnqueue()
    const once = applyWeeklyPostIncidentReviewFollowOnTrainingEnqueueTick(baseState, prior, withArtifact)
    const twice = applyWeeklyPostIncidentReviewFollowOnTrainingEnqueueTick(once, withArtifact, withArtifact)

    expect(twice).toBe(once)
    expect(twice.trainingQueue).toHaveLength(1)
  })

  it('does not enqueue for stub registry reviews or recommendation stubs', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const stubOnly = applyWeeklyPostIncidentReviewFollowOnTrainingEnqueueTick(
      stateReadyForThreatAssessmentEnqueue(),
      prior,
      prior
    )

    expect(stubOnly.trainingQueue).toHaveLength(0)

    const created = applyWeeklyPostIncidentReviewCreationTick(prior, {}, 12, [nearCatastropheDraft])
    const withArtifact = applyWeeklyPostIncidentReviewFollowOnArtifactTick(prior, created)
    const stubPath = applyWeeklyPostIncidentReviewFollowOnTrainingEnqueueTick(
      stateReadyForThreatAssessmentEnqueue(),
      prior,
      withArtifact
    )

    expect(stubPath.trainingQueue).toHaveLength(0)
    expect(withArtifact['review:near-catastrophe-case-major']?.unknownFields).toContain(
      'follow_on:recommendation-stub:near-catastrophe-case-major'
    )
  })

  it('allows distinct enqueue for closeout and near-catastrophe when both carry training refs', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const created = applyWeeklyPostIncidentReviewCreationTick(prior, {}, 12, [
      caseCloseoutDraft,
      nearCatastropheDraft,
    ])
    const withArtifact = applyWeeklyPostIncidentReviewFollowOnArtifactTick(prior, created)
    const withBothTrainingRefs = {
      ...withArtifact,
      'review:near-catastrophe-case-major': {
        ...withArtifact['review:near-catastrophe-case-major']!,
        unknownFields: ['follow_on:training-ref:analysis-lab', 'orchestration_week:12'],
      },
    }

    const next = applyWeeklyPostIncidentReviewFollowOnTrainingEnqueueTick(
      stateReadyForThreatAssessmentEnqueue(),
      prior,
      withBothTrainingRefs
    )

    expect(next.trainingQueue.map((entry) => entry.trainingId).sort()).toEqual([
      'analysis-lab',
      'threat-assessment',
    ])
  })

  it('skips enqueue when academy tier blocks the referenced program', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const created = applyWeeklyPostIncidentReviewCreationTick(prior, {}, 12, [caseCloseoutDraft])
    const withArtifact = applyWeeklyPostIncidentReviewFollowOnArtifactTick(prior, created)
    const next = applyWeeklyPostIncidentReviewFollowOnTrainingEnqueueTick(
      createStartingState(),
      prior,
      withArtifact
    )

    expect(next.trainingQueue).toHaveLength(0)
  })

  it('does not enqueue for stub registry reviews on a quiet tick', () => {
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const next = applyWeeklyPostIncidentReviewFollowOnTrainingEnqueueTick(
      stateReadyForThreatAssessmentEnqueue(),
      prior,
      prior
    )

    expect(next.trainingQueue).toHaveLength(0)
    expect(next.postIncidentReviewRecords?.[RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id]).toEqual(
      RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE
    )
  })
})
