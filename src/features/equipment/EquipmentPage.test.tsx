// cspell:words lockdown unequip unequips
import '../../test/setup'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { useGameStore } from '../../app/store/gameStore'
import EquipmentPage from './EquipmentPage'

function renderEquipmentPage() {
  return render(
    <MemoryRouter initialEntries={['/equipment']}>
      <EquipmentPage />
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('EquipmentPage', () => {
  it('shows active case gear recommendations', () => {
    const game = createStartingState()
    const sampleCase = Object.values(game.cases)[0]

    game.cases = {
      'case-occult': {
        ...sampleCase,
        id: 'case-occult',
        title: 'Ritual Site Lockdown',
        status: 'open',
        stage: 4,
        deadlineRemaining: 1,
        tags: ['occult', 'ritual'],
        requiredTags: ['occult'],
        preferredTags: ['containment'],
        assignedTeamIds: [],
      },
    }
    useGameStore.setState({ game })

    renderEquipmentPage()

    expect(screen.getByRole('heading', { name: /equipment support model/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /itemization layer/i })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /active case recommendations/i })
    ).toBeInTheDocument()
    const recommendationsSection = screen
      .getByRole('heading', { name: /active case recommendations/i })
      .closest('article')
    expect(recommendationsSection).not.toBeNull()
    expect(screen.getByRole('link', { name: /ritual site lockdown/i })).toHaveAttribute(
      'href',
      '/cases/case-occult'
    )
    expect(within(recommendationsSection!).getByText(/ward seals/i)).toBeInTheDocument()
    expect(within(recommendationsSection!).getByText(/stock 0 \/ queue 0/i)).toBeInTheDocument()
  })

  it('shows empty recommendation state when no unresolved operations exist', () => {
    const game = createStartingState()

    game.cases = Object.fromEntries(
      Object.values(game.cases).map((currentCase) => [
        currentCase.id,
        {
          ...currentCase,
          status: 'resolved',
        },
      ])
    )
    useGameStore.setState({ game })

    renderEquipmentPage()

    expect(screen.getByRole('heading', { name: /equipment support model/i })).toBeInTheDocument()
    expect(
      screen.getByText(
        /no active operations currently require targeted equipment recommendations\./i
      )
    ).toBeInTheDocument()
  })

  it('equips and unequips gear through the loadout controls', async () => {
    const user = userEvent.setup()
    const game = createStartingState()
    game.inventory.signal_jammers = 1
    useGameStore.setState({ game })

    renderEquipmentPage()

    await user.click(
      screen.getByRole('button', {
        name: /equip signal jammers to mina park utility 1/i,
      })
    )

    expect(useGameStore.getState().game.inventory.signal_jammers).toBe(0)
    expect(useGameStore.getState().game.agents.a_mina.equipmentSlots?.utility1).toBe(
      'signal_jammers'
    )

    await user.click(
      screen.getByRole('button', {
        name: /unequip utility 1 from mina park/i,
      })
    )

    expect(useGameStore.getState().game.inventory.signal_jammers).toBe(1)
    expect(useGameStore.getState().game.agents.a_mina.equipmentSlots?.utility1).toBeUndefined()
  })
})
