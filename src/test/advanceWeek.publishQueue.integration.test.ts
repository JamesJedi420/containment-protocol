import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  CANONICAL_PUBLISH_CREDITING_MANIFEST_FIXTURE,
  CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
  composePublishQueueRecord,
  evaluatePublishAutomationCreditingHooks,
} from '../domain/publishAutomationCreditingHooks'
import { evaluateContributionIntakeCuration, CANONICAL_CONTRIBUTION_SUBMISSION_FIXTURE } from '../domain/contributionIntakeCuration'
import {
  CANONICAL_RELEASE_ARTIFACT_MANIFEST_FIXTURE,
  evaluateModularReleasePackaging,
} from '../domain/modularReleasePackaging'
import { advanceWeek } from '../domain/sim/advanceWeek'
import {
  CANONICAL_SUBMISSION_GOVERNANCE_FIXTURE,
  evaluateSubmissionGovernanceRights,
} from '../domain/submissionGovernanceRights'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

function buildCanonicalReadyQueueRecord() {
  const acceptedCuration = evaluateContributionIntakeCuration(
    CANONICAL_CONTRIBUTION_SUBMISSION_FIXTURE
  )
  const packagedRelease = evaluateModularReleasePackaging(
    acceptedCuration,
    CANONICAL_RELEASE_ARTIFACT_MANIFEST_FIXTURE
  )
  const appliedGovernance = evaluateSubmissionGovernanceRights(
    CANONICAL_SUBMISSION_GOVERNANCE_FIXTURE
  )
  const decision = evaluatePublishAutomationCreditingHooks(
    packagedRelease,
    appliedGovernance,
    CANONICAL_PUBLISH_CREDITING_MANIFEST_FIXTURE
  )

  return composePublishQueueRecord({
    id: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id,
    label: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.label,
    releaseArtifactRef: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.releaseArtifactRef,
    decision,
    summary: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.summary,
    queuedWeek: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.queuedWeek,
  })!
}

describe('advanceWeek publish queue integration (SPE-2485 slice 1)', () => {
  it('is a no-op for an empty publish queue map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.publishQueueRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.publishQueueRecords).toEqual({})
  })

  it('transitions ready_to_publish records and surfaces dry-run execution notes', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    const record = buildCanonicalReadyQueueRecord()
    state.publishQueueRecords = {
      [record.id]: record,
    }

    const nextState = advanceWeek(state)
    const nextRecord = nextState.publishQueueRecords?.[record.id]

    expect(nextRecord?.status).toBe('published')

    const lastReport = nextState.reports[nextState.reports.length - 1]
    const publishQueueNote = lastReport?.notes?.find(
      (note) => note.type === 'contribution_release.publish_queue_execution'
    )

    expect(publishQueueNote).toBeDefined()
    expect(publishQueueNote?.content).toContain('Publish queue (dry-run)')
    expect(publishQueueNote?.content).toContain(record.label)
    expect(publishQueueNote?.content).toContain('dry-run:publish_channel:pr-merge:channel:pr-merge')
  })
})
