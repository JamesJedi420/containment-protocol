import '../test/setup'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import AppShell from './AppShell'
import { useGameStore } from './store/gameStore'
import IntelDetailPage from '../features/intel/IntelDetailPage'
import IntelPage from '../features/intel/IntelPage'

function renderIntelRoute(route = '/intel') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/intel" element={<IntelPage />} />
          <Route path="/intel/:templateId" element={<IntelDetailPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

it('renders the intel browser and links templates into detail routes', () => {
  renderIntelRoute('/intel')

  expect(screen.getByRole('heading', { name: /^intel$/i })).toBeInTheDocument()
  expect(screen.getByLabelText(/search/i)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /vampire nest in the stockyards/i })).toHaveAttribute(
    'href',
    '/intel/combat_vampire_nest'
  )
  expect(screen.getByRole('link', { name: /eclipse ritual at the riverfront/i })).toHaveAttribute(
    'href',
    '/intel/mixed_eclipse_ritual'
  )
})

it('supports direct entry to an intel detail route and its back link', async () => {
  const user = userEvent.setup()
  renderIntelRoute('/intel/mixed_eclipse_ritual')

  expect(screen.getByRole('region', { name: /intel dossier/i })).toBeInTheDocument()
  expect(screen.getByRole('region', { name: /intel analysis layout/i })).toBeInTheDocument()
  expect(screen.getByRole('complementary', { name: /starter coverage insights/i })).toBeInTheDocument()
  expect(screen.getByRole('region', { name: /starter coverage/i })).toBeInTheDocument()

  expect(
    screen.getAllByRole('heading', { name: /eclipse ritual at the riverfront/i }).length
  ).toBeGreaterThan(0)
  expect(screen.getAllByRole('link', { name: /back to intel/i }).length).toBeGreaterThan(0)

  const failSection = screen.getAllByText(/^on fail$/i)[0]?.closest('section')

  expect(failSection).not.toBeNull()
  expect(within(failSection!).getByRole('link', { name: /citywide blackout/i })).toHaveAttribute(
    'href',
    '/intel/followup_blackout'
  )
  expect(within(failSection!).getByRole('link', { name: /targeted abductions/i })).toHaveAttribute(
    'href',
    '/intel/followup_targeted_abductions'
  )
  expect(screen.getByText(/raid conversion at stage 2/i)).toBeInTheDocument()

  await user.click(screen.getByRole('link', { name: /back to intel/i }))

  expect(screen.getByRole('heading', { name: /^intel$/i })).toBeInTheDocument()
})

it('renders a local not-found state for an unknown intel template id', () => {
  renderIntelRoute('/intel/missing-template')

  expect(screen.getByRole('heading', { name: /intel not found/i })).toBeInTheDocument()
  expect(screen.getAllByRole('link', { name: /back to intel/i })[0]).toHaveAttribute(
    'href',
    '/intel'
  )
})
