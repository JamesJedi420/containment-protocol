// @vitest-environment jsdom
import '../../test/setup'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../../app/store/gameStore'
import { createStartingState } from '../../data/startingState'
import {
  COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
  RESTRICTED_DUAL_LOYALTY_PERSON_STATUS_FIXTURE,
} from '../../domain/affiliationPersonStatusRecords'
import {
  HOSTILE_TO_COOPERATIVE_FIXTURE,
  PENDING_TO_APPROVED_FIXTURE,
} from '../../domain/entityWelfareReclassificationRegistry'
import { buildAffiliationFileWorkQueueEvidenceResolutionRecordId } from '../../domain/affiliationFileWorkQueueEvidenceResolutionRecords'
import { buildAffiliationFileWorkQueueRepairActionRecordId } from '../../domain/affiliationFileWorkQueueRepairActionRecords'
import { buildAffiliationFileWorkQueueReleaseActionRecordId } from '../../domain/affiliationFileWorkQueueReleaseActionRecords'
import { buildAffiliationFileWorkQueueReleaseOutcomeRecordId } from '../../domain/affiliationFileWorkQueueReleaseOutcomeRecords'
import { buildAffiliationFileWorkQueueReleaseFulfillmentRecord } from '../../domain/affiliationFileWorkQueueReleaseFulfillmentRecords'
import { buildAffiliationFileWorkQueueReleasePackageRecordId } from '../../domain/affiliationFileWorkQueueReleasePackageRecords'
import AffiliationPersonStatusMirrorPage from './AffiliationPersonStatusMirrorPage'

function renderMirrorPage() {
  return render(
    <MemoryRouter initialEntries={['/affiliation-person-status']}>
      <Routes>
        <Route path="/affiliation-person-status" element={<AffiliationPersonStatusMirrorPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('AffiliationPersonStatusMirrorPage (SPE-2519 slice 1)', () => {
  it('renders empty state when no durable person-status records exist', () => {
    renderMirrorPage()

    expect(
      screen.getByRole('region', { name: /affiliation person-status mirror/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /empty person-status state/i })).toBeInTheDocument()
    expect(screen.getByText(/no affiliation person-status records/i)).toBeInTheDocument()
    expect(screen.getByText(/does not re-validate dropped entries/i)).toBeInTheDocument()
  })

  it('renders persisted durable person-status projection rows', () => {
    const game = createStartingState()
    game.entityWelfareReclassificationRecords = {
      [PENDING_TO_APPROVED_FIXTURE.id]: PENDING_TO_APPROVED_FIXTURE,
      [HOSTILE_TO_COOPERATIVE_FIXTURE.id]: HOSTILE_TO_COOPERATIVE_FIXTURE,
    }
    game.affiliationPersonStatusRecords = {
      [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]:
        COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
      [RESTRICTED_DUAL_LOYALTY_PERSON_STATUS_FIXTURE.id]:
        RESTRICTED_DUAL_LOYALTY_PERSON_STATUS_FIXTURE,
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    const queueRegion = screen.getByRole('region', {
      name: /file access work queue/i,
    })
    const recordsRegion = screen.getByRole('region', {
      name: /persisted affiliation person-status records/i,
    })

    expect(queueRegion).toHaveTextContent('File access work queue')
    expect(queueRegion).toHaveTextContent('Total 2')
    expect(queueRegion).toHaveTextContent('Blocked 0')
    expect(queueRegion).toHaveTextContent('Restricted 2')
    expect(queueRegion).toHaveTextContent('Missing review 0')
    expect(queueRegion).toHaveTextContent('Recommended action')
    expect(queueRegion).toHaveTextContent('Action status')
    expect(queueRegion).toHaveTextContent('Route restricted review')
    expect(queueRegion).toHaveTextContent('Not recorded')
    expect(queueRegion).toHaveTextContent(
      'Supervisor or review-gate handling is required before any file release.'
    )
    expect(queueRegion).toHaveTextContent('Facility file access: Restricted')
    expect(queueRegion).toHaveTextContent('Facility: Briefing Room')
    expect(recordsRegion).toHaveTextContent('Cooperative Contractor')
    expect(recordsRegion).toHaveTextContent('Rival Patron Risk')
    expect(recordsRegion).toHaveTextContent('Risk: Restricted')
    expect(recordsRegion).toHaveTextContent('Room access: Blocked')
    expect(recordsRegion).toHaveTextContent('File access: Restricted')
    expect(recordsRegion).toHaveTextContent('Facility file access: Restricted')
    expect(recordsRegion).toHaveTextContent('Facility: Briefing Room')
    expect(recordsRegion).toHaveTextContent('Housing access: Allowed')
    expect(recordsRegion).toHaveTextContent('Mission: Restricted')
    expect(recordsRegion).toHaveTextContent('person-status:cooperative-contractor-cleared')
  })

  it('records a file work queue operator action from the queue row', async () => {
    const user = userEvent.setup()
    const game = createStartingState()
    game.week = 8
    game.entityWelfareReclassificationRecords = {
      [PENDING_TO_APPROVED_FIXTURE.id]: PENDING_TO_APPROVED_FIXTURE,
    }
    game.affiliationPersonStatusRecords = {
      [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]: {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        entityWelfareReclassificationRef: PENDING_TO_APPROVED_FIXTURE.id,
      },
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    const queueRegion = screen.getByRole('region', {
      name: /file access work queue/i,
    })
    await user.click(screen.getByRole('button', { name: /record action/i }))

    expect(queueRegion).toHaveTextContent('Recorded W8')
    expect(queueRegion).not.toHaveTextContent('Not recorded')
    expect(useGameStore.getState().game.affiliationFileWorkQueueActionRecords).toEqual(
      expect.objectContaining({
        'affiliation-file-action:person-status:cooperative-contractor-cleared:route_restricted_review':
          expect.objectContaining({
            actionKind: 'route_restricted_review',
            actionLabel: 'Route restricted review',
            sourceBucket: 'restricted',
            recordedWeek: 8,
          }),
      })
    )
  })

  it('records a restricted file release review action from the queue row', async () => {
    const user = userEvent.setup()
    const game = createStartingState()
    game.week = 9
    game.entityWelfareReclassificationRecords = {
      [PENDING_TO_APPROVED_FIXTURE.id]: PENDING_TO_APPROVED_FIXTURE,
    }
    game.affiliationPersonStatusRecords = {
      [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]: {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        entityWelfareReclassificationRef: PENDING_TO_APPROVED_FIXTURE.id,
      },
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    const queueRegion = screen.getByRole('region', {
      name: /file access work queue/i,
    })
    await user.click(screen.getByRole('button', { name: /route restricted review/i }))
    const releaseActionId = buildAffiliationFileWorkQueueReleaseActionRecordId({
      workQueueEntryId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
      actionKind: 'restricted_release_review_routed',
    })

    expect(queueRegion).toHaveTextContent('Restricted release review routed W9')
    expect(
      screen.queryByRole('button', { name: /route restricted review/i })
    ).not.toBeInTheDocument()
    expect(useGameStore.getState().game.affiliationFileWorkQueueReleaseActionRecords).toEqual(
      expect.objectContaining({
        [releaseActionId]: expect.objectContaining({
          actionKind: 'restricted_release_review_routed',
          actionLabel: 'Restricted release review routed',
          sourceBucket: 'restricted',
          recordedWeek: 9,
        }),
      })
    )
  })

  it('records a release outcome after the release action is recorded', async () => {
    const user = userEvent.setup()
    const game = createStartingState()
    game.week = 9
    game.entityWelfareReclassificationRecords = {
      [PENDING_TO_APPROVED_FIXTURE.id]: PENDING_TO_APPROVED_FIXTURE,
    }
    game.affiliationPersonStatusRecords = {
      [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]: {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        entityWelfareReclassificationRef: PENDING_TO_APPROVED_FIXTURE.id,
      },
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    const queueRegion = screen.getByRole('region', {
      name: /file access work queue/i,
    })
    expect(screen.queryByRole('button', { name: /record review hold/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /route restricted review/i }))
    expect(screen.getByRole('button', { name: /record review hold/i })).toBeInTheDocument()

    useGameStore.setState({ game: { ...useGameStore.getState().game, week: 10 } })
    await user.click(screen.getByRole('button', { name: /record review hold/i }))
    const outcomeId = buildAffiliationFileWorkQueueReleaseOutcomeRecordId({
      workQueueEntryId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
      sourceActionKind: 'restricted_release_review_routed',
    })

    expect(queueRegion).toHaveTextContent('Restricted review pending W10')
    expect(screen.queryByRole('button', { name: /record review hold/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /record fulfillment/i })).not.toBeInTheDocument()
    expect(useGameStore.getState().game.affiliationFileWorkQueueReleaseOutcomeRecords).toEqual(
      expect.objectContaining({
        [outcomeId]: expect.objectContaining({
          sourceActionKind: 'restricted_release_review_routed',
          outcomeKind: 'restricted_review_pending',
          outcomeLabel: 'Restricted review pending',
          recordedWeek: 10,
        }),
      })
    )
  })

  it('records package handoff after an allowed file-release fulfillment exists', async () => {
    const user = userEvent.setup()
    const game = createStartingState()
    game.week = 13
    game.entityWelfareReclassificationRecords = {
      [PENDING_TO_APPROVED_FIXTURE.id]: PENDING_TO_APPROVED_FIXTURE,
    }
    game.affiliationPersonStatusRecords = {
      [COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id]: {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        entityWelfareReclassificationRef: PENDING_TO_APPROVED_FIXTURE.id,
        permissionSurface: 'file',
      },
    }
    const fulfillment = buildAffiliationFileWorkQueueReleaseFulfillmentRecord({
      workQueueEntryId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
      subjectId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.subjectId,
      subjectLabel: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.subjectLabel,
      sourceOutcomeKind: 'file_released',
      sourceBucket: 'allowed',
      sourceReasonCodes: ['file_permission_allowed', 'site_clearance_allowed'],
      fulfillmentKind: 'file_release_fulfilled',
      fulfillmentLabel: 'File release fulfilled',
      recordedWeek: 12,
    })
    game.affiliationFileWorkQueueReleaseFulfillmentRecords = {
      [fulfillment.id]: fulfillment,
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    const queueRegion = screen.getByRole('region', {
      name: /file access work queue/i,
    })
    expect(queueRegion).toHaveTextContent('File release fulfilled W12')
    expect(screen.getByRole('button', { name: /prepare handoff package/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /prepare handoff package/i }))

    const packageId = buildAffiliationFileWorkQueueReleasePackageRecordId({
      workQueueEntryId: COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id,
      sourceFulfillmentKind: 'file_release_fulfilled',
    })

    expect(queueRegion).toHaveTextContent('File release fulfilled W12')
    expect(queueRegion).toHaveTextContent('Safe file handoff package W13')
    expect(queueRegion).toHaveTextContent(
      `release-package:${COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE.id}:file_release_fulfilled`
    )
    expect(
      screen.queryByRole('button', { name: /prepare handoff package/i })
    ).not.toBeInTheDocument()
    expect(useGameStore.getState().game.affiliationFileWorkQueueReleasePackageRecords).toEqual(
      expect.objectContaining({
        [packageId]: expect.objectContaining({
          packageKind: 'safe_file_handoff_package',
          packageLabel: 'Safe file handoff package',
          recordedWeek: 13,
        }),
      })
    )
  })

  it('does not show file release controls for unresolved missing-review rows', () => {
    const game = createStartingState()
    game.affiliationPersonStatusRecords = {
      'person-status:missing-review': {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        id: 'person-status:missing-review',
        subjectId: 'subject:missing-review',
        subjectLabel: 'Missing Review Subject',
        candidateRef: 'candidate:missing',
        entityWelfareReclassificationRef: 'reclass:missing',
      },
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    const queueRegion = screen.getByRole('region', {
      name: /file access work queue/i,
    })

    expect(queueRegion).toHaveTextContent('Missing review 1')
    expect(screen.queryByRole('button', { name: /record release/i })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /route restricted review/i })
    ).not.toBeInTheDocument()
  })

  it('records missing-review evidence resolution from the queue row', async () => {
    const user = userEvent.setup()
    const game = createStartingState()
    game.week = 10
    game.affiliationPersonStatusRecords = {
      'person-status:missing-review': {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        id: 'person-status:missing-review',
        subjectId: 'subject:missing-review',
        subjectLabel: 'Missing Review Subject',
        candidateRef: 'candidate:missing',
        entityWelfareReclassificationRef: 'reclass:missing',
      },
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    const queueRegion = screen.getByRole('region', {
      name: /file access work queue/i,
    })
    expect(queueRegion).toHaveTextContent('Evidence unresolved')

    await user.click(screen.getByRole('button', { name: /record evidence resolution/i }))

    const resolutionId = buildAffiliationFileWorkQueueEvidenceResolutionRecordId({
      workQueueEntryId: 'person-status:missing-review',
      missingReasonCodes: [
        'missing_candidate_ref',
        'missing_entity_welfare_reclassification_ref',
        'missing_onboarding_clearance',
      ],
    })

    expect(queueRegion).toHaveTextContent('Evidence resolution recorded W10')
    expect(queueRegion).toHaveTextContent(
      'Candidate link repair: attach or restore recruitment candidate evidence.'
    )
    expect(queueRegion).toHaveTextContent(
      'Welfare link repair: attach or restore entity welfare reclassification evidence.'
    )
    expect(queueRegion).toHaveTextContent(
      'Onboarding repair: attach or restore clearance readiness evidence.'
    )
    expect(screen.getAllByRole('button', { name: /record repair action/i })).toHaveLength(3)

    await user.click(screen.getAllByRole('button', { name: /record repair action/i })[1])

    const repairActionId = buildAffiliationFileWorkQueueRepairActionRecordId({
      workQueueEntryId: 'person-status:missing-review',
      reasonCode: 'missing_entity_welfare_reclassification_ref',
    })

    expect(queueRegion).toHaveTextContent('Missing review 0')
    expect(queueRegion).toHaveTextContent('Restricted 1')
    expect(queueRegion).not.toHaveTextContent('missing_entity_welfare_reclassification_ref')
    expect(useGameStore.getState().game.affiliationFileWorkQueueRepairActionRecords).toEqual(
      expect.objectContaining({
        [repairActionId]: expect.objectContaining({
          workQueueEntryId: 'person-status:missing-review',
          reasonCode: 'missing_entity_welfare_reclassification_ref',
          recordedWeek: 10,
        }),
      })
    )
    expect(queueRegion).not.toHaveTextContent('Evidence unresolved')
    expect(useGameStore.getState().game.affiliationFileWorkQueueEvidenceResolutionRecords).toEqual(
      expect.objectContaining({
        [resolutionId]: expect.objectContaining({
          workQueueEntryId: 'person-status:missing-review',
          sourceBucket: 'missing_review',
          recordedWeek: 10,
        }),
      })
    )
  })

  it('repairs candidate evidence from a resolved missing-review queue row', async () => {
    const user = userEvent.setup()
    const game = createStartingState()
    game.week = 10
    game.affiliationPersonStatusRecords = {
      'person-status:missing-review': {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        id: 'person-status:missing-review',
        subjectId: 'subject:missing-review',
        subjectLabel: 'Missing Review Subject',
        candidateRef: 'candidate:missing',
        entityWelfareReclassificationRef: 'reclass:missing',
      },
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    const queueRegion = screen.getByRole('region', {
      name: /file access work queue/i,
    })

    expect(queueRegion).toHaveTextContent('Missing review 1')
    expect(queueRegion).toHaveTextContent('missing_candidate_ref')

    await user.click(screen.getByRole('button', { name: /record evidence resolution/i }))
    await user.click(screen.getAllByRole('button', { name: /record repair action/i })[0])

    expect(queueRegion).toHaveTextContent('Missing review 1')
    expect(queueRegion).toHaveTextContent('Restricted 0')
    expect(queueRegion).toHaveTextContent('Facility file access: -')
    expect(queueRegion).not.toHaveTextContent('missing_candidate_ref')
    expect(useGameStore.getState().game.candidates).toEqual([
      expect.objectContaining({
        id: 'candidate:missing',
        name: 'Missing Review Subject',
      }),
    ])
    expect(useGameStore.getState().game.recruitmentPool).toEqual([
      expect.objectContaining({
        id: 'candidate:missing',
        name: 'Missing Review Subject',
      }),
    ])
  })

  it('repairs welfare evidence from a resolved missing-review queue row', async () => {
    const user = userEvent.setup()
    const game = createStartingState()
    game.week = 10
    game.candidates = [
      {
        id: 'candidate:present',
        name: 'Welfare Repair Subject',
        age: 30,
        category: 'agent',
        hireStatus: 'available',
        weeklyCost: 0,
        weeklyWage: 0,
        revealLevel: 2,
      },
    ]
    game.recruitmentPool = [...game.candidates]
    game.affiliationPersonStatusRecords = {
      'person-status:welfare-missing': {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        id: 'person-status:welfare-missing',
        subjectId: 'subject:welfare-missing',
        subjectLabel: 'Welfare Repair Subject',
        candidateRef: 'candidate:present',
        entityWelfareReclassificationRef: 'reclass:welfare-missing',
      },
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    const queueRegion = screen.getByRole('region', {
      name: /file access work queue/i,
    })

    expect(queueRegion).toHaveTextContent('Missing review 1')
    expect(queueRegion).toHaveTextContent('missing_entity_welfare_reclassification_ref')

    await user.click(screen.getByRole('button', { name: /record evidence resolution/i }))
    await user.click(screen.getAllByRole('button', { name: /record repair action/i })[0])

    expect(queueRegion).toHaveTextContent('Missing review 0')
    expect(queueRegion).not.toHaveTextContent('missing_entity_welfare_reclassification_ref')
    expect(
      useGameStore.getState().game.entityWelfareReclassificationRecords?.['reclass:welfare-missing']
    ).toEqual(
      expect.objectContaining({
        id: 'reclass:welfare-missing',
        label: 'Welfare Repair Subject welfare link repair',
        proposedDisposition: 'unknown',
        reclassificationState: 'pending',
      })
    )
  })

  it('repairs onboarding clearance evidence from a resolved missing-review queue row', async () => {
    const user = userEvent.setup()
    const game = createStartingState()
    game.week = 10
    game.affiliationPersonStatusRecords = {
      'person-status:onboarding-missing': {
        ...COOPERATIVE_CONTRACTOR_PERSON_STATUS_FIXTURE,
        id: 'person-status:onboarding-missing',
        subjectId: 'subject:onboarding-missing',
        subjectLabel: 'Onboarding Repair Subject',
        candidateRef: undefined,
        entityWelfareReclassificationRef: 'reclass:onboarding-welfare-missing',
        backgroundCleared: undefined,
        trainingCompleted: undefined,
        oathContractSigned: undefined,
      },
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    const queueRegion = screen.getByRole('region', {
      name: /file access work queue/i,
    })

    expect(queueRegion).toHaveTextContent('Missing review 1')
    expect(queueRegion).toHaveTextContent('missing_onboarding_clearance')

    await user.click(screen.getByRole('button', { name: /record evidence resolution/i }))
    await user.click(screen.getAllByRole('button', { name: /record repair action/i })[1])

    expect(queueRegion).toHaveTextContent('Missing review 1')
    expect(queueRegion).not.toHaveTextContent('missing_onboarding_clearance')
    expect(queueRegion).toHaveTextContent('missing_entity_welfare_reclassification_ref')
    expect(useGameStore.getState().game.affiliationPersonStatusRecords).toEqual(
      expect.objectContaining({
        'person-status:onboarding-missing': expect.objectContaining({
          candidateRef: 'candidate:subject:onboarding-missing:onboarding-repair',
          backgroundCleared: true,
          trainingCompleted: true,
          oathContractSigned: true,
        }),
      })
    )
    expect(useGameStore.getState().game.recruitmentPool).toEqual([
      expect.objectContaining({
        id: 'candidate:subject:onboarding-missing:onboarding-repair',
        funnelStage: 'hired',
      }),
    ])
  })
})
