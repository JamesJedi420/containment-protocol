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

describe('App affiliation person-status route', () => {
  it('renders the read-only durable person-status mirror route', async () => {
    render(
      <MemoryRouter initialEntries={[APP_ROUTES.affiliationPersonStatus]}>
        <App />
      </MemoryRouter>
    )

    expect(
      await screen.findByRole('region', { name: /affiliation person-status mirror/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/no affiliation person-status records/i)).toBeInTheDocument()
  })
})
