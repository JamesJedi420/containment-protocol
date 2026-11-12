// @vitest-environment jsdom
import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  REDISCOVERY_LOOP_RECORD_FIXTURE,
  STUDY_BLOCKED_ARCHIVE_FIXTURE,
} from '../../domain/selfCensoringInformationRegistry'
import { useGameStore } from '../../app/store/gameStore'
import SelfCensoringInformationMirrorPage from './SelfCensoringInformationMirrorPage'

function renderMirrorPage() {
  return render(
    <MemoryRouter initialEntries={['/self-censoring-information']}>
      <Routes>
        <Route
          path="/self-censoring-information"
          element={<SelfCensoringInformationMirrorPage />}
        />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('SelfCensoringInformationMirrorPage (SPE-2108 slice 4)', () => {
  it('renders empty state when no persisted records exist', () => {
    renderMirrorPage()

    expect(
      screen.getByRole('region', { name: /self-censoring information registry mirror/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /empty registry state/i })).toBeInTheDocument()
    expect(screen.getByText(/no self-censoring information records/i)).toBeInTheDocument()
    expect(
      screen.getByText(/invalid records dropped on hydrate are not shown here/i)
    ).toBeInTheDocument()
  })

  it('renders persisted records when fixtures are hydrated', () => {
    const game = createStartingState()
    game.selfCensoringInformationRecords = {
      [REDISCOVERY_LOOP_RECORD_FIXTURE.id]: REDISCOVERY_LOOP_RECORD_FIXTURE,
      [STUDY_BLOCKED_ARCHIVE_FIXTURE.id]: STUDY_BLOCKED_ARCHIVE_FIXTURE,
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    const recordsRegion = screen.getByRole('region', {
      name: /persisted self-censoring information records/i,
    })

    expect(recordsRegion).toBeInTheDocument()
    expect(recordsRegion).toHaveTextContent(REDISCOVERY_LOOP_RECORD_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent(STUDY_BLOCKED_ARCHIVE_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent('assigned_supervisor_present (wing-c-east)')
    expect(recordsRegion).toHaveTextContent('Rediscovery loop count 2')
    expect(screen.getByRole('link', { name: /back to operations desk/i })).toHaveAttribute(
      'href',
      '/'
    )
  })
})
