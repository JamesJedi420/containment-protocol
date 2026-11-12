// @vitest-environment jsdom
import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE,
  COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE,
} from '../../domain/cognitiveHazardEngine'
import { useGameStore } from '../../app/store/gameStore'
import CognitiveHazardExposureMirrorPage from './CognitiveHazardExposureMirrorPage'

function renderMirrorPage() {
  return render(
    <MemoryRouter initialEntries={['/cognitive-hazard-exposure']}>
      <Routes>
        <Route path="/cognitive-hazard-exposure" element={<CognitiveHazardExposureMirrorPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('CognitiveHazardExposureMirrorPage (SPE-1309 slice 6)', () => {
  it('renders empty state when no persisted records exist', () => {
    renderMirrorPage()

    expect(
      screen.getByRole('region', { name: /cognitive hazard exposure registry mirror/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /empty registry state/i })).toBeInTheDocument()
    expect(screen.getByText(/no cognitive hazard exposure records/i)).toBeInTheDocument()
    expect(
      screen.getByText(/invalid records dropped on hydrate are not shown here/i)
    ).toBeInTheDocument()
  })

  it('renders persisted records when fixtures are hydrated', () => {
    const game = createStartingState()
    game.cognitiveHazardExposureRecords = {
      [COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE.id]:
        COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE,
      [COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE.id]: COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE,
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    const recordsRegion = screen.getByRole('region', {
      name: /persisted cognitive hazard exposure records/i,
    })

    expect(recordsRegion).toBeInTheDocument()
    expect(recordsRegion).toHaveTextContent(COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent(COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent('Knowledge integrity degraded')
    expect(recordsRegion).toHaveTextContent('Fear: 0.58')
    expect(screen.getByRole('link', { name: /back to operations desk/i })).toHaveAttribute(
      'href',
      '/'
    )
  })
})
