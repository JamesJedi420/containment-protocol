// @vitest-environment jsdom
import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { SPE_956_EXAMPLE_PROPAGATION_GRAPH_RECORDS } from '../../domain/spe956PropagationGraphPersistence'
import { useGameStore } from '../../app/store/gameStore'
import Spe956PropagationGraphMirrorPage from './Spe956PropagationGraphMirrorPage'

function renderMirrorPage() {
  return render(
    <MemoryRouter initialEntries={['/propagation-graph']}>
      <Routes>
        <Route path="/propagation-graph" element={<Spe956PropagationGraphMirrorPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('Spe956PropagationGraphMirrorPage (SPE-2626 slice 4)', () => {
  it('renders empty state when no persisted propagation graph records exist', () => {
    renderMirrorPage()

    expect(screen.getByRole('region', { name: /propagation graph summary/i })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /empty propagation graph state/i })).toBeInTheDocument()
    expect(screen.getByText(/no propagation graph records/i)).toBeInTheDocument()
    expect(
      screen.getByText(/empty maps do not satisfy parent acceptance criteria/i)
    ).toBeInTheDocument()
  })

  it('renders authored graph rows when EXAMPLE fixture is hydrated', () => {
    const game = createStartingState()
    game.spe956PropagationGraphRecords = {
      ...SPE_956_EXAMPLE_PROPAGATION_GRAPH_RECORDS,
    }
    useGameStore.setState({ game })

    renderMirrorPage()

    expect(
      screen.getByRole('region', { name: /persisted propagation graph leak footage to rumor forum chain/i })
    ).toBeInTheDocument()
    expect(screen.getByText('Leaked footage artifact')).toBeInTheDocument()
    expect(screen.getByText('Rumor forum platform')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to operations desk/i })).toHaveAttribute('href', '/')
  })
})
