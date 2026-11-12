import '../../test/setup'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router'
import { createStartingState } from '../../data/startingState'
import type { GameState } from '../../domain/models'
import { useGameStore } from '../../app/store/gameStore'
import { queryStaffTimeAllocation, commitStaffTime } from '../../domain/staffTimeAllocation'
import { previewFacilityMaintenanceConversion } from '../../domain/facilityMaintenanceConversion'
import { projectFacilityMaintenanceView } from './facilityMaintenanceView'
import { MaintenanceConversionPanel } from './MaintenanceConversionPanel'
import AgencyPage from './AgencyPage'

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({
    game: {
      ...createStartingState(),
      staff: {
        analyst: {
          id: 'analyst',
          name: 'Analyst',
          specialty: 'analysis',
          operationalPostId: 'staff-post:analysis:1',
        },
      } as unknown as GameState['staff'],
      facilityStockpile: { pressure_seal_gasket: 2 },
    },
  })
})
function Surface() {
  const { game, convertFacilityMaintenanceResources } = useGameStore()
  return (
    <MaintenanceConversionPanel
      conversion={projectFacilityMaintenanceView(game).conversion}
      onConvert={convertFacilityMaintenanceResources}
    />
  )
}

describe('Agency Command conversion controls', () => {
  it('exposes requirements and stock tradeoff, executes by pointer, and announces release and weekly exhaustion', () => {
    render(<Surface />)
    expect(
      screen.getByText(/otherwise available for direct pressure-seal repairs/)
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Convert gasket and staff time' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Conversion staff member'), {
      target: { value: 'analyst' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Convert gasket and staff time' }))
    expect(screen.getByRole('status')).toHaveTextContent('Staff capacity is released')
    expect(screen.getByRole('status')).toHaveAttribute('aria-atomic', 'true')
    expect(screen.getByText(/already converted this week/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Convert gasket and staff time' })).toBeDisabled()
    expect(queryStaffTimeAllocation(useGameStore.getState().game).availableIds).toContain('analyst')
  })

  it('executes the same transaction through native keyboard controls on the actual Agency page', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AgencyPage />
      </MemoryRouter>
    )
    await user.selectOptions(screen.getByLabelText('Conversion staff member'), 'analyst')
    screen.getByLabelText('Conversion staff member').focus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Convert gasket and staff time' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(useGameStore.getState().game.facilityStockpile?.pressure_seal_gasket).toBe(1)
  })

  it('shows authoritative conflict destination without silently displacing a reservation', () => {
    const game = useGameStore.getState().game
    const reserved = commitStaffTime(game, {
      id: 'other',
      destination: 'workshop:first',
      staffIds: ['analyst'],
      week: game.week,
      displacedAlternative: null,
      revision: queryStaffTimeAllocation(game).revision,
    }).game
    useGameStore.setState({ game: reserved })
    render(<Surface />)
    fireEvent.change(screen.getByLabelText('Conversion staff member'), {
      target: { value: 'analyst' },
    })
    expect(screen.getByText(/Reserved use: workshop:first/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Convert gasket and staff time' })).toBeDisabled()
    expect(useGameStore.getState().game).toBe(reserved)
  })

  it('announces stale execution and agrees with domain preview when eligibility changes after render', () => {
    const prior = useGameStore.getState().game
    const conversion = projectFacilityMaintenanceView(prior).conversion
    expect(conversion.staff[0].canConvert).toBe(
      previewFacilityMaintenanceConversion(prior, 'analyst').canConvert
    )
    render(
      <MaintenanceConversionPanel
        conversion={conversion}
        onConvert={useGameStore.getState().convertFacilityMaintenanceResources}
      />
    )
    fireEvent.change(screen.getByLabelText('Conversion staff member'), {
      target: { value: 'analyst' },
    })
    const changed = { ...prior, facilityStockpile: undefined }
    useGameStore.setState({ game: changed })
    fireEvent.click(screen.getByRole('button', { name: 'Convert gasket and staff time' }))
    expect(screen.getByRole('status')).toHaveTextContent('preview changed')
    expect(useGameStore.getState().game).toBe(changed)
  })
})
