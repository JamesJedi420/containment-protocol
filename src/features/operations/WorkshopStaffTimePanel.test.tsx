import '../../test/setup'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import type { GameState } from '../../domain/models'
import { queryStaffTimeAllocation } from '../../domain/staffTimeAllocation'
import { useGameStore } from '../../app/store/gameStore'
import { WorkshopStaffTimePanel } from './WorkshopStaffTimePanel'

beforeEach(() => {
  useGameStore.persist.clearStorage()
  const game = createStartingState()
  game.staff = {
    analyst: { specialty: 'analysis', operationalPostId: 'staff-post:analysis:1' },
  } as unknown as GameState['staff']
  game.departmentWorkshopWorkOrders = Object.fromEntries(
    ['first', 'second'].map((id) => [
      id,
      {
        id,
        departmentId: 'department:records-analysis',
        caseId: `case:${id}`,
        taskType: 'records_review',
        requiredWork: 2,
      },
    ])
  )
  game.departmentWorkshopSnapshots = {
    'department:records-analysis': {
      departmentId: 'department:records-analysis',
      slotCapacity: 2,
      active: [
        { workOrderId: 'first', completedWork: 0 },
        { workOrderId: 'second', completedWork: 0 },
      ],
      queued: [],
      paused: [],
    },
  }
  useGameStore.setState({ game })
})

describe('archive staff reservation controls', () => {
  it('submits the same command through keyboard activation', async () => {
    const user = userEvent.setup()
    render(<WorkshopStaffTimePanel />)
    await user.selectOptions(screen.getByLabelText('Records-review order'), 'first')
    await user.selectOptions(screen.getByLabelText('Analysis staff member'), 'analyst')
    await user.tab()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Reserve for this week' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent('Staff reserved.')
    expect(queryStaffTimeAllocation(useGameStore.getState().game).active).toHaveLength(1)
  })
  it('reserves canonical capacity, announces the result and releases through the same store seam', () => {
    render(<WorkshopStaffTimePanel />)
    fireEvent.change(screen.getByLabelText('Records-review order'), { target: { value: 'first' } })
    fireEvent.change(screen.getByLabelText('Analysis staff member'), {
      target: { value: 'analyst' },
    })
    fireEvent.change(screen.getByLabelText('Displaced records-review order'), {
      target: { value: 'second' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Reserve for this week' }))
    expect(screen.getByRole('status')).toHaveTextContent('Staff reserved.')
    expect(screen.getByRole('status')).toHaveAttribute('aria-atomic', 'true')
    expect(queryStaffTimeAllocation(useGameStore.getState().game).availableIds).toEqual([])
    const persisted = JSON.parse(localStorage.getItem('containment-protocol-game-state')!)
    expect(persisted.state.game.staffTimeAllocations).toEqual(
      useGameStore.getState().game.staffTimeAllocations
    )
    expect(screen.getByText(/workshop:second/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Release reservation/ }))
    expect(screen.getByRole('status')).toHaveTextContent('Reservation released.')
    expect(queryStaffTimeAllocation(useGameStore.getState().game).availableIds).toEqual(['analyst'])
  })
  it('fails closed for malformed present allocation state', () => {
    useGameStore.setState({
      game: {
        ...useGameStore.getState().game,
        staffTimeAllocations: { version: 1, unavailable: true },
      },
    })
    render(<WorkshopStaffTimePanel />)
    expect(screen.getByRole('button', { name: 'Reserve for this week' })).toBeDisabled()
    expect(screen.getByText(/Staff allocation is unavailable/)).toBeInTheDocument()
  })
  it('explains an invalidated contributor without replacing staff automatically', () => {
    render(<WorkshopStaffTimePanel />)
    fireEvent.change(screen.getByLabelText('Records-review order'), { target: { value: 'first' } })
    fireEvent.change(screen.getByLabelText('Analysis staff member'), {
      target: { value: 'analyst' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Reserve for this week' }))
    act(() => useGameStore.setState({ game: { ...useGameStore.getState().game, staff: {} } }))
    expect(screen.getByText(/Reserved contributor is no longer usable/)).toBeInTheDocument()
  })
  it('reset removes reservation history', () => {
    const game = useGameStore.getState().game
    useGameStore.getState().reserveWorkshopStaffTime({
      id: `workshop:${game.week}:first`,
      week: game.week,
      staffIds: ['analyst'],
      destination: 'workshop:first',
      displacedAlternative: null,
      revision: queryStaffTimeAllocation(game).revision,
    })
    useGameStore.getState().reset()
    expect(useGameStore.getState().game.staffTimeAllocations).toBeUndefined()
  })
})
