// @vitest-environment jsdom
import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
  PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE,
} from '../../domain/psychologicalResilienceRegistry'
import { useGameStore } from '../../app/store/gameStore'
import PsychologicalResilienceMirrorPage from './PsychologicalResilienceMirrorPage'

function renderMirrorPage() {
  return render(
    <MemoryRouter initialEntries={['/psychological-resilience']}>
      <Routes>
        <Route path="/psychological-resilience" element={<PsychologicalResilienceMirrorPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('PsychologicalResilienceMirrorPage (SPE-1615 slice 5)', () => {
  it('renders empty state when no persisted records exist', () => {
    renderMirrorPage()

    expect(
      screen.getByRole('region', { name: /psychological resilience registry mirror/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /empty registry state/i })).toBeInTheDocument()
    expect(screen.getByText(/no psychological resilience records/i)).toBeInTheDocument()
    expect(
      screen.getByText(/invalid records dropped on hydrate are not shown here/i)
    ).toBeInTheDocument()
  })

  it('renders persisted records when fixtures are hydrated', () => {
    const game = createStartingState()
    game.psychologicalResilienceRecords = {
      [PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.id]:
        PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
      [PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE.id]:
        PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE,
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    const recordsRegion = screen.getByRole('region', {
      name: /persisted psychological resilience records/i,
    })

    expect(recordsRegion).toBeInTheDocument()
    expect(screen.getByText(PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.label)).toBeInTheDocument()
    expect(screen.getByText(PSYCHOLOGICAL_RESILIENCE_TREATMENT_BREAKDOWN_FIXTURE.label)).toBeInTheDocument()
    expect(recordsRegion).toHaveTextContent('Exposure elevated')
    expect(recordsRegion).toHaveTextContent('Treatment gated')
  })
})
