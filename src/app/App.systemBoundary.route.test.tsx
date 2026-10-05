import '../test/setup'
import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { createStartingState } from '../data/startingState'
import App from './App'
import { useGameStore } from './store/gameStore'
import { APP_ROUTES } from './routes'

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('App future-expansion system boundary routes', () => {
  it.each([
    {
      path: APP_ROUTES.rankings,
      heading: /^rankings$/i,
      routeNote: /deferred/i,
    },
    {
      path: APP_ROUTES.containmentSite,
      heading: /^containment site$/i,
      routeNote: /placeholder route/i,
    },
  ])(
    'resolves $path to SystemBoundaryPage future-boundary UI inside the shell',
    async ({ path, heading, routeNote }) => {
      render(
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      )

      expect(screen.getByRole('banner', { name: /shell status bar/i })).toBeInTheDocument()
      expect(await screen.findByRole('heading', { level: 2, name: heading })).toBeInTheDocument()
      expect(screen.getByText(/future expansion surface/i)).toBeInTheDocument()
      expect(screen.getByText(routeNote, { selector: 'p' })).toBeInTheDocument()
      expect(
        screen.queryByRole('heading', { level: 2, name: /route not found/i })
      ).not.toBeInTheDocument()
    }
  )

  it('renders Agency Command and applies a facility recovery order through the production route', async () => {
    const game = createStartingState()
    game.facilityMaintenanceState = { maintenanceDebt: 18, lastProcessedWeek: 0 }
    useGameStore.setState({ game })
    render(
      <MemoryRouter initialEntries={[APP_ROUTES.agency]}>
        <App />
      </MemoryRouter>
    )
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Agency Command' })
    ).toBeInTheDocument()
    expect(screen.queryByText(/future expansion surface/i)).not.toBeInTheDocument()
    const order = screen.getByRole('button', { name: 'Order facility recovery' })
    expect(order).toBeEnabled()
    fireEvent.click(order)
    expect(screen.getByText('Recovery budget: 0 hours / 0 parts')).toBeInTheDocument()
    expect(screen.getByText(/Maintenance debt: 0/)).toBeInTheDocument()
    expect(order).toBeDisabled()
    expect(useGameStore.getState().game.facilityMaintenanceState).toEqual({
      maintenanceDebt: 0,
      lastProcessedWeek: 0,
    })
  })
})
