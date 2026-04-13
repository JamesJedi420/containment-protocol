import '../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { useGameStore } from './store/gameStore'
import { createStartingState } from '../data/startingState'

describe('App factions route', () => {
  beforeEach(() => {
    useGameStore.persist.clearStorage()
    useGameStore.setState({ game: createStartingState() })
  })

  it('renders the faction contacts screen as a routed player-facing surface', async () => {
    render(
      <MemoryRouter initialEntries={['/factions']}>
        <App />
      </MemoryRouter>
    )

    expect(screen.getByRole('banner', { name: /shell status bar/i })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1, name: /^factions$/i })).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: /faction contacts & standing/i })
    ).toBeInTheDocument()
  })
})
