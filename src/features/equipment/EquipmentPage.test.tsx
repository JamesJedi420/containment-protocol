// cspell:words lockdown unequip unequips
import '../../test/setup'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
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
  it('shows deconstruction and active-queue empty states', () => {
    const game = createStartingState()
    game.inventory = {}
    game.equipmentDeconstructionQueue = []
    useGameStore.setState({ game })

    renderEquipmentPage()

    expect(
      screen.getByText(/no equipment stock is available for deconstruction/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/no equipment is currently being dismantled/i)).toBeInTheDocument()
  })

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

  it('previews and confirms canonical-grade equipment deconstruction', async () => {
    const user = userEvent.setup()
    const game = createStartingState()
    game.inventory.signal_jammers = 1
    useGameStore.setState({ game })

    renderEquipmentPage()

    expect(screen.getByRole('heading', { name: /equipment deconstruction/i })).toBeInTheDocument()
    expect(screen.getAllByText(/grade ii/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/electronic parts ×2/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /review deconstruction signal jammers/i }))
    expect(screen.getByText(/permanently consumes one signal jammers/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /confirm deconstruction signal jammers/i }))

    const next = useGameStore.getState().game
    expect(next.inventory.signal_jammers).toBe(0)
    expect(next.equipmentDeconstructionQueue?.[0]).toMatchObject({
      itemId: 'signal_jammers',
      sourceGradeId: 'grade_2',
    })
    expect(screen.getByText(/1 week remaining/i)).toBeInTheDocument()
  })

  it('shows a stable blocker instead of consuming fabricated-lot stock', () => {
    const game = createStartingState()
    game.inventory.signal_jammers = 1
    game.fabricatedEquipmentLots = {
      fabricated: {
        queueId: 'fabricated',
        recipeId: 'signal-jammers',
        itemId: 'signal_jammers',
        quantity: 1,
        gradeId: 'grade_2',
        completedWeek: 1,
      },
    }
    useGameStore.setState({ game })

    renderEquipmentPage()

    expect(screen.getByText(/fabricated batch selection is unavailable/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /review deconstruction signal jammers/i })
    ).toBeDisabled()
  })

  it('previews, confirms, updates, and disables the weekly Auto-Scrap policy', async () => {
    const user = userEvent.setup()
    const game = createStartingState()
    game.inventory.medkits = 2
    game.inventory.signal_jammers = 1
    useGameStore.setState({ game })

    renderEquipmentPage()

    expect(screen.getByRole('heading', { name: /weekly auto-scrap/i })).toBeInTheDocument()
    expect(screen.getByText(/include 2 unit\(s\).*exclude 1 unit\(s\)/i)).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText(/grade threshold/i), 'grade_2')
    expect(screen.getByText(/include 3 unit\(s\).*exclude 0 unit\(s\)/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /review auto-scrap through grade ii/i }))
    expect(screen.getByRole('group', { name: /confirm auto-scrap policy/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /confirm auto-scrap/i }))

    expect(useGameStore.getState().game.equipmentAutoScrapPolicy).toEqual({
      state: 'enabled',
      thresholdGradeId: 'grade_2',
    })
    expect(screen.getByText(/active through grade ii/i)).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/grade threshold/i), 'grade_3')
    await user.click(screen.getByRole('button', { name: /review auto-scrap through grade iii/i }))
    await user.click(screen.getByRole('button', { name: /confirm auto-scrap/i }))
    expect(useGameStore.getState().game.equipmentAutoScrapPolicy).toEqual({
      state: 'enabled',
      thresholdGradeId: 'grade_3',
    })
    expect(screen.getByText(/active through grade iii/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /disable auto-scrap/i }))
    expect(useGameStore.getState().game.equipmentAutoScrapPolicy).toEqual({ state: 'disabled' })
    expect(
      screen.getByText(/disabled\. no equipment will be routed automatically/i)
    ).toBeInTheDocument()
  })
})
