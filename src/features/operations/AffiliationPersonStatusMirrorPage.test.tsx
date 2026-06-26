// @vitest-environment jsdom
import '../../test/setup'
import { render, screen } from '@testing-library/react'
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
    expect(queueRegion).toHaveTextContent('Route restricted review')
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
})
