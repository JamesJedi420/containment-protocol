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

describe('App /help route', () => {
  it('renders bounded guidance index with core surface links', async () => {
    render(
      <MemoryRouter initialEntries={[APP_ROUTES.help]}>
        <App />
      </MemoryRouter>
    )

    expect(await screen.findByRole('heading', { level: 2, name: /^help$/i })).toBeInTheDocument()
    expect(screen.queryByText(/placeholder help surface/i)).not.toBeInTheDocument()

    const helpNav = screen.getByRole('navigation', { name: /core command surfaces/i })
    expect(helpNav).toBeInTheDocument()
    expect(helpNav.querySelector(`a[href="${APP_ROUTES.operationsDesk}"]`)).toBeTruthy()
    expect(helpNav.querySelector(`a[href="${APP_ROUTES.report}"]`)).toBeTruthy()
  })
})
