// @vitest-environment jsdom
import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  MISSED_STREAK_ELEVATED_RISK_FIXTURE,
  WEEKLY_PSYCH_SCREENING_FIXTURE,
} from '../../domain/containedPersonTherapeuticCareRegistry'
import { useGameStore } from '../../app/store/gameStore'
import ContainedPersonTherapeuticCareMirrorPage from './ContainedPersonTherapeuticCareMirrorPage'

function renderMirrorPage() {
  return render(
    <MemoryRouter initialEntries={['/contained-person-therapeutic-care']}>
      <Routes>
        <Route
          path="/contained-person-therapeutic-care"
          element={<ContainedPersonTherapeuticCareMirrorPage />}
        />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('ContainedPersonTherapeuticCareMirrorPage (SPE-2115 slice 4)', () => {
  it('renders empty state when no persisted records exist', () => {
    renderMirrorPage()

    expect(
      screen.getByRole('region', { name: /contained person therapeutic care registry mirror/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /empty registry state/i })).toBeInTheDocument()
    expect(
      screen.getByText(/no contained person therapeutic care records/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/invalid records dropped on hydrate are not shown here/i)
    ).toBeInTheDocument()
  })

  it('renders persisted records when fixtures are hydrated', () => {
    const game = createStartingState()
    game.containedPersonTherapeuticCareRecords = {
      [WEEKLY_PSYCH_SCREENING_FIXTURE.id]: WEEKLY_PSYCH_SCREENING_FIXTURE,
      [MISSED_STREAK_ELEVATED_RISK_FIXTURE.id]: MISSED_STREAK_ELEVATED_RISK_FIXTURE,
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    const recordsRegion = screen.getByRole('region', {
      name: /persisted contained person therapeutic care records/i,
    })

    expect(recordsRegion).toBeInTheDocument()
    expect(recordsRegion).toHaveTextContent(WEEKLY_PSYCH_SCREENING_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent(MISSED_STREAK_ELEVATED_RISK_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent('Psych Screening')
    expect(recordsRegion).toHaveTextContent('Degraded')
    expect(screen.getByRole('link', { name: /back to operations desk/i })).toHaveAttribute(
      'href',
      '/'
    )
  })
})
