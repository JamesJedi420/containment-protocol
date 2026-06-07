// @vitest-environment jsdom
import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  EXTERNAL_AUDIT_CLEARED_REVIEW_FIXTURE,
  RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
} from '../../domain/postIncidentReviewRegistry'
import { useGameStore } from '../../app/store/gameStore'
import PostIncidentReviewMirrorPage from './PostIncidentReviewMirrorPage'

function renderMirrorPage() {
  return render(
    <MemoryRouter initialEntries={['/post-incident-review']}>
      <Routes>
        <Route path="/post-incident-review" element={<PostIncidentReviewMirrorPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('PostIncidentReviewMirrorPage (SPE-868 slice 3)', () => {
  it('renders empty state when no persisted records exist', () => {
    const game = createStartingState()
    game.postIncidentReviewRecords = {}
    useGameStore.setState({ game })

    renderMirrorPage()

    expect(
      screen.getByRole('region', { name: /post-incident review registry mirror/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /empty registry state/i })).toBeInTheDocument()
    expect(screen.getByText(/no post-incident review records/i)).toBeInTheDocument()
    expect(
      screen.getByText(/invalid records dropped on hydrate are not shown here/i)
    ).toBeInTheDocument()
  })

  it('renders persisted records when fixtures are hydrated', () => {
    const game = createStartingState()
    game.postIncidentReviewRecords = {
      [RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.id]: RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE,
      [EXTERNAL_AUDIT_CLEARED_REVIEW_FIXTURE.id]: EXTERNAL_AUDIT_CLEARED_REVIEW_FIXTURE,
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    const recordsRegion = screen.getByRole('region', {
      name: /persisted post-incident review records/i,
    })

    expect(recordsRegion).toBeInTheDocument()
    expect(recordsRegion).toHaveTextContent(RECURRENCE_CYCLE_CLOSEOUT_REVIEW_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent(EXTERNAL_AUDIT_CLEARED_REVIEW_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent('External Audit')
    expect(recordsRegion).toHaveTextContent('Administratively Cleared')
    expect(screen.getByRole('link', { name: /back to operations desk/i })).toHaveAttribute(
      'href',
      '/'
    )
  })
})
