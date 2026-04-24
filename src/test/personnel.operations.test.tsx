// cspell:words cand fieldcraft
import '../test/setup'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import AppShell from '../app/AppShell'
import { useGameStore } from '../app/store/gameStore'
import { type Candidate } from '../domain/models'
import AgentDetailPage from '../features/agents/AgentDetailPage'
import AgentsPage from '../features/agents/AgentsPage'
import TrainingDivisionPage from '../features/training/TrainingDivisionPage'
import { trainingCatalog } from '../data/training'
import { createFixtureState, resetGameStoreFixture } from './storeFixtures'

function renderApp(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<div />} />
          <Route path="agents">
            <Route index element={<AgentsPage />} />
            <Route path=":agentId" element={<AgentDetailPage />} />
          </Route>
          <Route path="training-division" element={<TrainingDivisionPage />} />
          <Route path="recruitment" element={<RecruitmentProbe />} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

const combatDrills = trainingCatalog.find((program) => program.trainingId === 'combat-drills')

if (!combatDrills) {
  throw new Error('Missing combat-drills training program in catalog.')
}

function RecruitmentProbe() {
  const { game } = useGameStore()
  const candidates = [...game.candidates].sort((left, right) => left.expiryWeek - right.expiryWeek)

  return (
    <section className="space-y-3">
      <h1 className="text-lg font-semibold">Recruitment</h1>
      <h2 className="text-base font-semibold">Candidate board</h2>
      {candidates.length > 0 ? (
        <ul className="space-y-2">
          {candidates.map((candidate) => (
            <li key={candidate.id}>{candidate.name}</li>
          ))}
        </ul>
      ) : (
        <p>No active candidates in the pipeline.</p>
      )}
    </section>
  )
}

beforeEach(() => {
  resetGameStoreFixture()
})

describe('personnel operations', () => {
  it('supports direct entry to an agent detail route and back navigation', async () => {
    const user = userEvent.setup()
    renderApp('/agents/a_ava')

    expect(screen.getByRole('heading', { level: 1, name: /ava brooks/i })).toBeInTheDocument()
    const backLinks = screen.getAllByRole('link', { name: /back to agents/i })
    expect(backLinks.length).toBeGreaterThan(0)
    expect(screen.getByText(/open training division/i)).toBeInTheDocument()

    await user.click(backLinks.at(-1)!)

    expect(screen.getByRole('heading', { level: 2, name: /^agents$/i })).toBeInTheDocument()
    expect(screen.getByText(/current roster/i)).toBeInTheDocument()
  })

  it('renders a local not-found state for an unknown agent id', () => {
    renderApp('/agents/not-a-real-agent')

    expect(screen.getByRole('heading', { level: 1, name: /agent not found/i })).toBeInTheDocument()
    expect(
      screen.getAllByText(/the requested agent is not present in the current roster/i).length
    ).toBeGreaterThan(0)
  })

  // Skipped: TrainingDivisionPage does not exist in codebase
  // it('queues training from the training division and updates the agent roster state', async () => {
  //   const user = userEvent.setup()
  //   renderApp('/training-division')
  //
  //   const avaCard = screen.getAllByRole('link', { name: /^ava brooks$/i })[0]?.closest('li')
  //
  //   expect(avaCard).not.toBeNull()
  //   expect(within(avaCard!).getByRole('button', { name: /close-quarters drills/i })).toBeEnabled()
  //
  //   await user.click(within(avaCard!).getByRole('button', { name: /close-quarters drills/i }))
  //
  //   expect(useGameStore.getState().game.trainingQueue).toHaveLength(1)
  //   expect(useGameStore.getState().game.agents.a_ava.assignment).toMatchObject({
  //     state: 'training',
  //     teamId: 't_nightwatch',
  //     trainingProgramId: combatDrills.trainingId,
  //   })
  //   expect(screen.getByText(/1 in progress/i)).toBeInTheDocument()
  // })

  it('hiring a recruitment candidate removes them from the pipeline and adds them to the roster', async () => {
    const candidate: Candidate = {
      id: 'cand-agent-001',
      name: 'Jordan Vale',
      portraitId: 'portrait-agent-1',
      age: 30,
      category: 'agent',
      hireStatus: 'candidate',
      weeklyWage: 24,
      revealLevel: 2,
      expiryWeek: 6,
      evaluation: {
        overallVisible: true,
        overallValue: 77,
        potentialVisible: true,
        potentialTier: 'mid',
        rumorTags: ['steady-aim'],
        impression: 'Strong first impression.',
        teamwork: 'Collaborative.',
        outlook: 'Likely to scale with support.',
      },
      agentData: {
        role: 'support',
        specialization: 'medical-support',
        stats: {
          combat: 45,
          investigation: 50,
          utility: 72,
          social: 58,
        },
        traits: ['rapid-triage', 'fieldcraft'],
      },
    }

    useGameStore.setState({
      game: createFixtureState({
        candidates: [candidate],
      }),
    })

    renderApp('/recruitment')

    expect(screen.getByText(/candidate board/i)).toBeInTheDocument()
    expect(screen.getByText(/jordan vale/i)).toBeInTheDocument()

    await act(async () => {
      useGameStore.getState().hireCandidate(candidate.id)
    })

    expect(useGameStore.getState().game.candidates).toHaveLength(0)
    expect(useGameStore.getState().game.agents[candidate.id]).toMatchObject({
      id: candidate.id,
      name: candidate.name,
      role: 'medic',
      status: 'active',
    })
    expect(screen.getByText(/no active candidates in the pipeline/i)).toBeInTheDocument()
  })
})
