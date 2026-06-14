// @vitest-environment jsdom
import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { DISCLOSURE_PROGRESSION_FIXTURE } from '../../domain/publicDisclosureStateRegistry'
import { useGameStore } from '../../app/store/gameStore'
import PublicDisclosureCampaignPage from './PublicDisclosureCampaignPage'

function renderCampaignPage() {
  return render(
    <MemoryRouter initialEntries={['/campaign/public-disclosure']}>
      <Routes>
        <Route path="/campaign/public-disclosure" element={<PublicDisclosureCampaignPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('PublicDisclosureCampaignPage (SPE-861 slice 1)', () => {
  it('renders empty state when no persisted records exist', () => {
    renderCampaignPage()

    expect(
      screen.getByRole('region', { name: /public disclosure campaign briefing/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /empty campaign state/i })).toBeInTheDocument()
    expect(screen.getByText(/no active disclosure campaigns/i)).toBeInTheDocument()
  })

  it('renders populated campaign cards when fixtures are hydrated', () => {
    const game = createStartingState()
    game.publicDisclosureRecords = {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
    }
    useGameStore.setState({ game })

    renderCampaignPage()

    expect(screen.getByText('Opposed posture')).toBeInTheDocument()

    const campaignsRegion = screen.getByRole('region', { name: /active disclosure campaigns/i })

    expect(campaignsRegion).toBeInTheDocument()
    expect(campaignsRegion).toHaveTextContent(DISCLOSURE_PROGRESSION_FIXTURE.label)
    expect(campaignsRegion).toHaveTextContent('Official Disclosure')
    expect(campaignsRegion).toHaveTextContent('Coastal Metro')
    expect(campaignsRegion).not.toHaveTextContent(DISCLOSURE_PROGRESSION_FIXTURE.id)
    expect(screen.getByRole('link', { name: /back to operations desk/i })).toHaveAttribute(
      'href',
      '/'
    )
  })

  it('renders segment trust chips when population and channel segments diverge', () => {
    const game = createStartingState()
    game.publicDisclosureRecords = {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: {
        ...DISCLOSURE_PROGRESSION_FIXTURE,
        trustByRegion: [
          { regionRef: 'population:general-public', trustScore: 0.72 },
          { regionRef: 'channel:community-forums', trustScore: 0.18 },
        ],
      },
    }
    useGameStore.setState({ game })

    renderCampaignPage()

    expect(screen.getByText(/segment trust diverges/i)).toBeInTheDocument()
    expect(screen.getByText(/Population: General Public — High/i)).toBeInTheDocument()
    expect(screen.getByText(/Channel: Community Forums — Low/i)).toBeInTheDocument()
  })

  it('does not mutate GameState after render', () => {
    const game = createStartingState()
    game.publicDisclosureRecords = {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
    }
    useGameStore.setState({ game })

    const before = JSON.stringify(useGameStore.getState().game)

    renderCampaignPage()

    expect(JSON.stringify(useGameStore.getState().game)).toBe(before)
  })
})
