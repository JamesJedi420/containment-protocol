// @vitest-environment jsdom
import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { SPE_947_EXAMPLE_PERSISTENCE_FIXTURE } from '../../domain/spe947EvaluatorPersistence'
import { useGameStore } from '../../app/store/gameStore'
import Spe947EvaluatorMirrorPage from './Spe947EvaluatorMirrorPage'

function renderMirrorPage() {
  return render(
    <MemoryRouter initialEntries={['/hazardous-content-propagation']}>
      <Routes>
        <Route path="/hazardous-content-propagation" element={<Spe947EvaluatorMirrorPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('Spe947EvaluatorMirrorPage (SPE-2578 slice 1)', () => {
  it('renders empty state when no persisted spe947* maps exist', () => {
    renderMirrorPage()

    expect(
      screen.getByRole('region', { name: /hazardous content propagation evaluator mirror/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /empty evaluator mirror state/i })).toBeInTheDocument()
    expect(screen.getByText(/no hazardous content evaluator records/i)).toBeInTheDocument()
    expect(
      screen.getByText(/empty maps do not satisfy parent acceptance criteria/i)
    ).toBeInTheDocument()
  })

  it('renders authored platform and plan rows when EXAMPLE fixture is hydrated', () => {
    const game = createStartingState()
    Object.assign(game, SPE_947_EXAMPLE_PERSISTENCE_FIXTURE)
    useGameStore.setState({ game })

    renderMirrorPage()

    const platformsRegion = screen.getByRole('region', {
      name: /persisted spe-947 platforms/i,
    })
    const plansRegion = screen.getByRole('region', {
      name: /persisted spe-947 counter-memetic plans/i,
    })

    expect(platformsRegion).toHaveTextContent('Local rumor forum')
    expect(plansRegion).toHaveTextContent('Corrective lore wave')
    expect(screen.getByRole('link', { name: /back to operations desk/i })).toHaveAttribute(
      'href',
      '/'
    )
  })
})
