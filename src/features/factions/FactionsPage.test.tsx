import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { useGameStore } from '../../app/store/gameStore'
import FactionsPage from './FactionsPage'

function renderFactionsPage() {
  return render(
    <MemoryRouter initialEntries={['/factions']}>
      <FactionsPage />
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('FactionsPage', () => {
  it('renders faction pressure entries from deterministic domain output', () => {
    renderFactionsPage()

    expect(screen.getByRole('heading', { name: /external actors/i })).toBeInTheDocument()
    expect(screen.getByText(/oversight bureau/i)).toBeInTheDocument()
    expect(screen.getByText(/academic institutions/i)).toBeInTheDocument()
    expect(screen.getAllByText(/active incidents/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/operational leverage/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/access channel/i).length).toBeGreaterThan(0)
  })
})
