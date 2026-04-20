import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'

import { createStartingState } from '../../data/startingState'
import { useGameStore } from '../../app/store/gameStore'
import { advanceWeek } from '../../domain/sim/advanceWeek'
import { OperationsReportPanel } from './OperationsReportPanel'

function createOutcomeState() {
  const state = createStartingState()
  const caseId = Object.keys(state.cases)[0]!
  const teamId = Object.keys(state.teams)[0]!
  const currentCase = state.cases[caseId]!
  const team = state.teams[teamId]!

  state.cases[caseId] = {
    ...currentCase,
    mode: 'deterministic',
    status: 'in_progress',
    assignedTeamIds: [teamId],
    durationWeeks: 1,
    weeksRemaining: 1,
    requiredRoles: [],
    requiredTags: [],
  }
  state.teams[teamId] = {
    ...team,
    memberIds: [...(team.agentIds ?? team.memberIds ?? [])],
    agentIds: [...(team.agentIds ?? team.memberIds ?? [])],
    status: { state: 'deployed', assignedCaseId: caseId },
  }

  return advanceWeek(state)
}

describe('OperationsReportPanel', () => {
  beforeEach(() => {
    useGameStore.persist.clearStorage()
    useGameStore.setState({ game: createOutcomeState() })
  })

  it('renders the compact player-facing report surfaces', () => {
    render(
      <MemoryRouter>
        <OperationsReportPanel />
      </MemoryRouter>
    )

    expect(screen.getByRole('region', { name: /operations report/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /weekly operations summary/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /mission routing report/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /deployment readiness report/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /recent outcome report/i })).toBeInTheDocument()
    expect(screen.getAllByRole('link').length).toBeGreaterThan(0)
  })
})
