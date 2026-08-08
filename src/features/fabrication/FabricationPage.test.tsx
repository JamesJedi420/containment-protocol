// cspell:words medkits
import '../../test/setup'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { useGameStore } from '../../app/store/gameStore'
import FabricationPage from './FabricationPage'

function renderFabricationPage() {
  return render(
    <MemoryRouter initialEntries={['/fabrication']}>
      <FabricationPage />
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('FabricationPage', () => {
  it('renders fabrication economics and queues a recipe deterministically', async () => {
    const user = userEvent.setup()

    renderFabricationPage()

    expect(screen.getByRole('heading', { name: /fabrication lab model/i })).toBeInTheDocument()
    expect(screen.getByText(/lab costs are deterministic/i)).toBeInTheDocument()

    await user.click(screen.getByLabelText(/Queue Ward Seal Batch/i))

    expect(useGameStore.getState().game.productionQueue).toHaveLength(1)
  })

  it('renders recipe material requirements from the domain recipe catalog', () => {
    renderFabricationPage()

    expect(screen.getByText(/Materials: Medical Supplies x2/i)).toBeInTheDocument()
    expect(screen.getByText(/Material stores/i)).toBeInTheDocument()
    expect(screen.getByText(/^Electronic Parts$/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Grade outcome: Grade I/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/canonical equipment definition/i).length).toBeGreaterThan(0)
  })

  it('uses the hidden-safe projection for a queued outcome', () => {
    const state = createStartingState()
    const queued = useGameStore.getState().queueFabrication
    useGameStore.setState({ game: state })
    queued('med-kits')
    const next = useGameStore.getState().game
    next.productionQueue = next.productionQueue.map((entry) => ({
      ...entry,
      outputGradeVisibility: 'hidden',
    }))
    useGameStore.setState({ game: next })

    renderFabricationPage()

    expect(screen.getByText(/Grade outcome: Grade unknown/i)).toBeInTheDocument()
  })

  it('disables queueing when recipe materials are missing', () => {
    const state = createStartingState()
    state.inventory.medical_supplies = 0
    useGameStore.setState({ game: state })

    renderFabricationPage()

    expect(screen.getByLabelText(/Queue Emergency Medkits/i)).toBeDisabled()
    expect(screen.getByText(/Missing: Medical Supplies x2/i)).toBeInTheDocument()
  })
})
