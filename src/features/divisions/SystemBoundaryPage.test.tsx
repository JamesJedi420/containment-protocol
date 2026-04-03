import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { createStartingState } from '../../data/startingState'
import { useGameStore } from '../../app/store/gameStore'
import { SystemBoundaryPage } from './SystemBoundaryPage'

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('SystemBoundaryPage', () => {
  it('marks placeholder division surfaces as future expansion routes', () => {
    render(
      <MemoryRouter>
        <SystemBoundaryPage boundary="factions" />
      </MemoryRouter>
    )

    expect(screen.getByText(/future expansion surface/i)).toBeInTheDocument()
    expect(
      screen.getByText(/intentionally separated from the mvp gameplay loop/i)
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /^factions$/i })).toBeInTheDocument()
  })

  it('renders not-found boundary copy for catch-all route usage', () => {
    render(
      <MemoryRouter>
        <SystemBoundaryPage boundary="notFound" returnTo={APP_ROUTES.operationsDesk} />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { level: 2, name: /route not found/i })).toBeInTheDocument()
    expect(screen.getByText(/this system boundary is not defined/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /return to operations desk/i })).toHaveAttribute(
      'href',
      APP_ROUTES.operationsDesk
    )
  })
})
