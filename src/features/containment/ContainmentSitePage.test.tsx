import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { useGameStore } from '../../app/store/gameStore'
import {
  buildMajorIncidentState,
  buildEndgameScalingState,
  formatDifficultyPressureSummary,
  formatEndgameThresholdSummary,
} from '../../domain/strategicState'
import ContainmentSitePage from './ContainmentSitePage'

function renderContainmentSitePage() {
  return render(
    <MemoryRouter initialEntries={['/containment-site']}>
      <ContainmentSitePage />
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('ContainmentSitePage', () => {
  it('renders incident pressure, staged incident details, and encounter generation sections', () => {
    const game = createStartingState()
    game.cases['case-003'] = {
      ...game.cases['case-003'],
      stage: 5,
      deadlineRemaining: 0,
    }
    useGameStore.setState({ game })

    renderContainmentSitePage()

    const incident = buildMajorIncidentState(game).incidents[0]

    expect(screen.getByRole('heading', { name: /containment control/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /endgame scaling/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /major incident board/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /encounter structure/i })).toBeInTheDocument()
    expect(screen.getByText(/incident origins/i)).toBeInTheDocument()
    expect(screen.getByText(/likely follow-on incidents/i)).toBeInTheDocument()
    expect(screen.getByText(/active threat signatures/i)).toBeInTheDocument()
    expect(screen.getByText(/coordinated cult operation/i)).toBeInTheDocument()
    expect(screen.getByText(/stage progression/i)).toBeInTheDocument()
    expect(screen.getByText(/incident modifiers/i)).toBeInTheDocument()
    expect(
      screen.getByText(formatEndgameThresholdSummary(buildEndgameScalingState(game)))
    ).toBeInTheDocument()
    expect(
      screen.getByText(`Pressure: ${formatDifficultyPressureSummary(incident!.difficultyPressure)}`)
    ).toBeInTheDocument()
  })
})
