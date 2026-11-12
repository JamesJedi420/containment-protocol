// @vitest-environment jsdom
import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  HIGH_READINESS_QUEUE_FIXTURE,
  LOW_READINESS_RECENT_QUEUE_FIXTURE,
} from '../../domain/patternSourceSeriesRegistry'
import { useGameStore } from '../../app/store/gameStore'
import PatternSourceSeriesMirrorPage from './PatternSourceSeriesMirrorPage'

function renderMirrorPage() {
  return render(
    <MemoryRouter initialEntries={['/pattern-source-series']}>
      <Routes>
        <Route path="/pattern-source-series" element={<PatternSourceSeriesMirrorPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('PatternSourceSeriesMirrorPage (SPE-2110 slice 4)', () => {
  it('renders empty state when no persisted intake records exist', () => {
    renderMirrorPage()

    expect(
      screen.getByRole('region', { name: /pattern source series intake mirror/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /empty intake state/i })).toBeInTheDocument()
    expect(screen.getByText(/no intake records/i)).toBeInTheDocument()
    expect(
      screen.getByText(/invalid records dropped on hydrate are not shown here/i)
    ).toBeInTheDocument()
  })

  it('renders queue projection and persisted records when fixtures are hydrated', () => {
    const game = createStartingState()
    game.patternSourceSeriesRecords = {
      [HIGH_READINESS_QUEUE_FIXTURE.id]: HIGH_READINESS_QUEUE_FIXTURE,
      [LOW_READINESS_RECENT_QUEUE_FIXTURE.id]: LOW_READINESS_RECENT_QUEUE_FIXTURE,
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    const queueRegion = screen.getByRole('region', { name: /processing queue projection/i })
    const recordsRegion = screen.getByRole('region', { name: /persisted intake records/i })

    expect(queueRegion).toBeInTheDocument()
    expect(recordsRegion).toBeInTheDocument()
    expect(queueRegion).toHaveTextContent(HIGH_READINESS_QUEUE_FIXTURE.title)
    expect(recordsRegion).toHaveTextContent(LOW_READINESS_RECENT_QUEUE_FIXTURE.title)
    expect(queueRegion).toHaveTextContent('0.91')
    expect(screen.getByRole('link', { name: /back to operations desk/i })).toHaveAttribute(
      'href',
      '/'
    )
  })
})
