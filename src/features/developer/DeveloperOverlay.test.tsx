import '../../test/setup'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../../app/store/gameStore'
import { createStartingState } from '../../data/startingState'
import { DeveloperOverlay } from './DeveloperOverlay'

describe('DeveloperOverlay', () => {
  beforeEach(() => {
    useGameStore.persist.clearStorage()
    useGameStore.setState({ game: createStartingState() })
  })

  it('toggles the developer overlay panel through the existing debug flag channel', async () => {
    const user = userEvent.setup()
    render(<DeveloperOverlay />)

    expect(screen.queryByRole('complementary', { name: /developer overlay/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /show developer overlay/i }))

    expect(screen.getByRole('complementary', { name: /developer overlay/i })).toBeInTheDocument()
    expect(useGameStore.getState().game.runtimeState?.ui.debug.flags.developerOverlay).toBe(true)

    await user.click(screen.getByRole('button', { name: /hide developer overlay/i }))

    expect(screen.queryByRole('complementary', { name: /developer overlay/i })).not.toBeInTheDocument()
  })

  it('renders safely even when runtime state is sparse', async () => {
    const user = userEvent.setup()
    const sparse = createStartingState()
    sparse.runtimeState = undefined
    useGameStore.setState({ game: sparse })

    render(<DeveloperOverlay />)
    await user.click(screen.getByRole('button', { name: /show developer overlay/i }))

    expect(screen.getByText(/hub: operations-desk/i)).toBeInTheDocument()
    expect(screen.getByText(/no persistent flags\./i)).toBeInTheDocument()
  })

  it('can clear developer log entries from the overlay', async () => {
    const user = userEvent.setup()
    useGameStore.getState().setPersistentFlag('contact.ivy.introduced', true)

    render(<DeveloperOverlay />)
    await user.click(screen.getByRole('button', { name: /show developer overlay/i }))

    expect(screen.getByRole('heading', { name: /developer log/i })).toBeInTheDocument()
    expect(screen.getByText(/flag set: contact\.ivy\.introduced/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /clear log/i }))

    expect(screen.getByText(/no developer log entries\./i)).toBeInTheDocument()
  })

  it('exposes bounded reset controls for queue/log, encounter state, and front-desk baseline', async () => {
    const user = userEvent.setup()

    useGameStore.getState().enqueueRuntimeEvent({
      type: 'authored.follow_up',
      targetId: 'frontdesk.debug.followup',
      week: 1,
    })
    useGameStore.getState().setEncounterRuntimeState('encounter.debug.overlay', {
      status: 'active',
      phase: 'debug',
    })

    render(<DeveloperOverlay />)
    await user.click(screen.getByRole('button', { name: /show developer overlay/i }))

    expect(screen.getByRole('button', { name: /reset queue \+ log/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reset encounter/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /front-desk baseline/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /reset encounter/i }))

    expect(useGameStore.getState().game.runtimeState?.encounterState).toEqual({})
    expect(useGameStore.getState().game.runtimeState?.eventQueue.entries ?? []).toEqual([])
  })
})
