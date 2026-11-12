// @vitest-environment jsdom
import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  ACTOR_TRUTH_LAYER_FIXTURE,
  COMPETING_TRUTH_LAYERS_FIXTURE,
} from '../../domain/truthLayerRecordRegistry'
import { applyWeeklyTruthLayerTick } from '../../domain/truthLayerWeeklyOrchestration'
import { useGameStore } from '../../app/store/gameStore'
import TruthLayerMirrorPage from './TruthLayerMirrorPage'

function renderMirrorPage() {
  return render(
    <MemoryRouter initialEntries={['/truth-layer-records']}>
      <Routes>
        <Route path="/truth-layer-records" element={<TruthLayerMirrorPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('TruthLayerMirrorPage (SPE-1343 slice 4)', () => {
  it('renders empty state when no persisted records exist', () => {
    renderMirrorPage()

    expect(
      screen.getByRole('region', { name: /truth-layer record registry mirror/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /empty registry state/i })).toBeInTheDocument()
    expect(screen.getByText(/no truth-layer records/i)).toBeInTheDocument()
    expect(
      screen.getByText(/invalid records dropped on hydrate are not shown here/i)
    ).toBeInTheDocument()
  })

  it('renders persisted records with separate review slots and weekly snapshot', () => {
    const game = createStartingState()
    game.truthLayerRecords = {
      [COMPETING_TRUTH_LAYERS_FIXTURE.id]: COMPETING_TRUTH_LAYERS_FIXTURE,
      [ACTOR_TRUTH_LAYER_FIXTURE.id]: ACTOR_TRUTH_LAYER_FIXTURE,
    }
    const tick = applyWeeklyTruthLayerTick(game.truthLayerRecords, 15)
    game.truthLayerWeeklyProjectionSnapshots = tick.snapshots
    useGameStore.setState({ game })

    renderMirrorPage()

    const recordsRegion = screen.getByRole('region', {
      name: /persisted truth-layer records/i,
    })

    expect(recordsRegion).toBeInTheDocument()
    expect(recordsRegion).toHaveTextContent(COMPETING_TRUTH_LAYERS_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent(ACTOR_TRUTH_LAYER_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent('Industrial solvent leak prompted precautionary campus evacuation.')
    expect(recordsRegion).toHaveTextContent('Containment breach contained to sub-basement wing')
    expect(recordsRegion).toHaveTextContent('Anomalous residue breached secondary seal')
    expect(recordsRegion).toHaveTextContent('Myth infrastructure active: Yes')
    expect(recordsRegion).toHaveTextContent('Correction pressure: 0.62')
    expect(recordsRegion).toHaveTextContent('Snapshot week W15')
    expect(screen.getByRole('link', { name: /back to operations desk/i })).toHaveAttribute(
      'href',
      '/'
    )
  })
})
