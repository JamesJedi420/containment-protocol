// @vitest-environment jsdom
import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE } from '../../domain/surveillanceCapacityInterventionTuningRegistry'
import { useGameStore } from '../../app/store/gameStore'
import SurveillanceInterventionTuningMirrorPage from './SurveillanceInterventionTuningMirrorPage'

function renderMirrorPage() {
  return render(
    <MemoryRouter initialEntries={['/surveillance-intervention-tuning']}>
      <Routes>
        <Route
          path="/surveillance-intervention-tuning"
          element={<SurveillanceInterventionTuningMirrorPage />}
        />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('SurveillanceInterventionTuningMirrorPage (SPE-848 slice 4)', () => {
  it('renders empty state when no persisted records exist', () => {
    renderMirrorPage()

    expect(
      screen.getByRole('region', { name: /surveillance intervention tuning registry mirror/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /empty registry state/i })).toBeInTheDocument()
    expect(screen.getByText(/no surveillance intervention tuning records/i)).toBeInTheDocument()
    expect(
      screen.getByText(/invalid records dropped on hydrate are not shown here/i)
    ).toBeInTheDocument()
  })

  it('renders persisted records when fixtures are hydrated', () => {
    const game = createStartingState()
    game.surveillanceInterventionTuningRecords = {
      [SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.id]: SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE,
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    const recordsRegion = screen.getByRole('region', {
      name: /persisted surveillance intervention tuning records/i,
    })

    expect(recordsRegion).toBeInTheDocument()
    expect(screen.getByText(SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.label)).toBeInTheDocument()
    expect(recordsRegion).toHaveTextContent('Monitoring exceeds contact')
    expect(recordsRegion).toHaveTextContent('Sustained under collateral strain')
  })
})
