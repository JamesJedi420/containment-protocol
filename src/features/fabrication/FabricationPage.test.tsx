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
