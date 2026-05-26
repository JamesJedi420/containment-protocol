import '../test/setup'
import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
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
    {
      path: APP_ROUTES.agency,
      heading: /^agency$/i,
      routeNote: /command surface ships/i,
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
})
