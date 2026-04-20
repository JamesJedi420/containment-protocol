import '../../test/setup'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../../app/store/gameStore'
import { createStartingState } from '../../data/startingState'
import { getContractOffers } from '../../domain/contracts'
import ContractBoardPage from './ContractBoardPage'

function renderContractBoard() {
  return render(
    <MemoryRouter initialEntries={['/contracts']}>
      <Routes>
        <Route path="/contracts" element={<ContractBoardPage />} />
        <Route path="/cases" element={<p>Cases home</p>} />
        <Route path="/teams" element={<p>Teams home</p>} />
        <Route path="/report" element={<p>Reports home</p>} />
        <Route path="/intel" element={<p>Intel home</p>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ContractBoardPage', () => {
  beforeEach(() => {
    useGameStore.persist.clearStorage()
    useGameStore.setState({ game: createStartingState() })
  })

  it('renders the contract board route from canonical generated offers', () => {
    const game = createStartingState()
    const offers = getContractOffers(game)
    useGameStore.setState({ game })

    renderContractBoard()

    expect(screen.getByRole('region', { name: /contract board overview/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^contract board$/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /contract list/i })).toBeInTheDocument()
    const list = screen.getByTestId('contract-board-list')
    expect(list).toBeInTheDocument()
    expect(screen.getByTestId('contract-board-detail')).toBeInTheDocument()
    expect(within(list).getByRole('button', { name: new RegExp(offers[0]!.name, 'i') })).toBeInTheDocument()
    expect(within(list).getByRole('button', { name: new RegExp(offers[1]!.name, 'i') })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /reward framing/i })).toBeInTheDocument()
    expect(screen.getAllByText(/priority/i).length).toBeGreaterThan(0)
  })

  it('updates the inspection panel when a different contract is selected', async () => {
    const user = userEvent.setup()
    const game = createStartingState()
    const offers = getContractOffers(game)
    useGameStore.setState({ game })

    renderContractBoard()

    await user.click(screen.getByRole('button', { name: new RegExp(offers[1]!.name, 'i') }))

    await waitFor(() => {
      expect(
        within(screen.getByTestId('contract-board-detail')).getByRole('heading', {
          name: new RegExp(`^${offers[1]!.name}$`, 'i'),
        })
      ).toBeInTheDocument()
    })
  })

  it('shows derived blocker reasons for unavailable contract channels', async () => {
    const user = userEvent.setup()

    renderContractBoard()

    await user.click(screen.getByRole('button', { name: /clean room audit window/i }))

    await waitFor(() => {
      expect(screen.getAllByText(/requires oversight lockdown retainer/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/requires oversight bureau standing friendly/i).length).toBeGreaterThan(0)
    })
  })

  it('emphasizes one headline reward and keeps live-contract intel explicitly provisional', async () => {
    const user = userEvent.setup()
    const game = createStartingState()
    const researchOffer = getContractOffers(game).find(
      (offer) => offer.strategyTag === 'research' && (offer.rewards.research?.length ?? 0) > 0
    )
    useGameStore.setState({ game })

    renderContractBoard()

    await user.click(screen.getByRole('button', { name: new RegExp(researchOffer!.name, 'i') }))

    await waitFor(() => {
      const detail = within(screen.getByTestId('contract-board-detail'))
      expect(detail.getByText(/research unlock/i)).toBeInTheDocument()
      expect(detail.getByText(researchOffer!.rewards.research![0]!.label)).toBeInTheDocument()
      expect(detail.getAllByText(/board estimate only/i).length).toBeGreaterThan(0)
      expect(detail.getAllByText(/field packet|field verification/i).length).toBeGreaterThan(0)
      expect(detail.getByText(/known now:/i)).toBeInTheDocument()
      expect(detail.getByText(/uncertain:/i)).toBeInTheDocument()
      expect(detail.getByText(/next step:/i)).toBeInTheDocument()
    })
  })

  it('surfaces faction posture and hidden-effect context from canonical faction state', async () => {
    const user = userEvent.setup()
    const game = createStartingState()
    game.factions!.oversight.reputation = 45
    useGameStore.setState({ game })

    renderContractBoard()

    const oversightOffer = getContractOffers(game).find((offer) => offer.factionId === 'oversight')

    await user.click(screen.getByRole('button', { name: new RegExp(oversightOffer!.name, 'i') }))

    await waitFor(() => {
      const detail = within(screen.getByTestId('contract-board-detail'))
      expect(detail.getByRole('heading', { name: /faction context/i })).toBeInTheDocument()
      expect(detail.getAllByText(/oversight bureau/i).length).toBeGreaterThan(0)
      expect(detail.getByText(/known faction effects/i)).toBeInTheDocument()
      expect(detail.getByText(/unknown influence detected/i)).toBeInTheDocument()
      expect(detail.getByText(/success likely improves oversight bureau standing/i)).toBeInTheDocument()
      expect(detail.getByText(/failure likely strains oversight bureau/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /^factions$/i })).toBeInTheDocument()
    })
  })

  it('keeps blocked contracts visible, selected, and visually marked as blocked', async () => {
    const user = userEvent.setup()

    renderContractBoard()

    const blockedButton = screen.getByRole('button', { name: /clean room audit window/i })
    await user.click(blockedButton)

    await waitFor(() => {
      const detail = within(screen.getByTestId('contract-board-detail'))
      expect(blockedButton).toHaveAttribute('data-contract-tone', 'danger')
      expect(blockedButton.className).toMatch(/border-red-/)
      expect(detail.getByText(/locked channel/i)).toBeInTheDocument()
      expect(detail.getByText(/unresolved intel/i)).toBeInTheDocument()
      expect(detail.getByText(/field confidence, uncertainty, and blind spots remain unresolved/i)).toBeInTheDocument()
    })
  })

  it('launches through the existing contract flow from the recommended action panel', async () => {
    const user = userEvent.setup()

    renderContractBoard()

    const launchButton = screen.getAllByTestId('contract-board-launch-action')[0]
    await user.click(launchButton)

    const activeContractCase = Object.values(useGameStore.getState().game.cases).find(
      (currentCase) => currentCase.contract && currentCase.assignedTeamIds.length > 0
    )

    expect(activeContractCase).toBeDefined()
    expect(useGameStore.getState().game.events.some((event) => event.type === 'case.spawned')).toBe(
      true
    )
  })
})
