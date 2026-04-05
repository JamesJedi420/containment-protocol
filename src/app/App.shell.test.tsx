import '../test/setup'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import AppShell from './AppShell'
import OperationsDeskPage from '../features/operations/OperationsDeskPage'
import AgentsPage from '../features/agents/AgentsPage'
import { createStartingState } from '../data/startingState'
import { useGameStore } from './store/gameStore'
import { FUTURE_EXPANSION_APP_SYSTEMS } from './systemRegistry'

function renderShell(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<OperationsDeskPage />} />
          <Route path="agents" element={<AgentsPage />} />
          <Route path="recruitment" element={<RecruitmentStub />} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

function RecruitmentStub() {
  return (
    <section className="space-y-2">
      <h1 className="text-lg font-semibold">Recruitment</h1>
      <p>Candidate board</p>
    </section>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('minimal shell layout', () => {
  it('renders the primary tab navigation', () => {
    renderShell()

    expect(screen.getByRole('navigation', { name: /primary operations/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^operations desk$/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^cases$/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^agents$/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^recruitment$/i })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /mvp systems/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^teams$/i })).toBeInTheDocument()

    if (FUTURE_EXPANSION_APP_SYSTEMS.length > 0) {
      expect(
        screen.getByRole('navigation', { name: /future expansion systems/i })
      ).toBeInTheDocument()
      expect(
        screen.getByText(/these surfaces read live state but stay outside the mvp command loop/i)
      ).toBeInTheDocument()

      for (const route of FUTURE_EXPANSION_APP_SYSTEMS) {
        expect(
          screen.getByRole('link', { name: new RegExp(`^${route.label}$`, 'i') })
        ).toBeInTheDocument()
      }
    } else {
      expect(
        screen.queryByRole('navigation', { name: /future expansion systems/i })
      ).not.toBeInTheDocument()
      expect(
        screen.queryByText(/these surfaces read live state but stay outside the mvp command loop/i)
      ).not.toBeInTheDocument()
    }
  })

  it('renders the agents shell page', async () => {
    const user = userEvent.setup()
    renderShell()

    await user.click(screen.getByRole('link', { name: /^agents$/i }))

    expect(screen.getByRole('heading', { level: 1, name: /^agents$/i })).toBeInTheDocument()
    expect(screen.getByText(/current roster/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ava brooks/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /ava brooks/i })).toBeInTheDocument()
  })

  it('renders the recruitment shell page', async () => {
    const user = userEvent.setup()
    renderShell()

    await user.click(screen.getByRole('link', { name: /^recruitment$/i }))

    expect(screen.getByText(/candidate board/i)).toBeInTheDocument()
  })
})
