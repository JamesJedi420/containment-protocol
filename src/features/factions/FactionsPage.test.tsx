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
  it('renders the bounded faction contacts screen from canonical faction state', () => {
    renderFactionsPage()

    expect(screen.getByRole('heading', { name: /faction contacts & standing/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /recent faction activity/i })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: /known \/ hidden effects/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('heading', { name: /^contacts$/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/oversight bureau/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/academic institutions/i).length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText(/standing band/i).length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText(/posture/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /open contracts/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open recruitment/i })).toBeInTheDocument()
  })
})
