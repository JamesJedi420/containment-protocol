import '../../../test/setup'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import App from './App'
import { useIncidentStore } from './store/incidentStore'

function LocationProbe() {
  const location = useLocation()

  return <output data-testid="location-display">{`${location.pathname}${location.search}`}</output>
}

function renderApp(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
      <LocationProbe />
    </MemoryRouter>
  )
}

beforeEach(() => {
  useIncidentStore.persist.clearStorage()
  useIncidentStore.getState().reset()
})

describe('App', () => {
  it('renders the routed overview shell', () => {
    renderApp()

    expect(screen.getByRole('heading', { name: /containment protocol/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /containment overview/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open sector watch/i })).toBeInTheDocument()
    expect(screen.getByText(/seal integrity/i)).toBeInTheDocument()
  })

  it('filters sectors by tone on the sector watch route', async () => {
    const user = userEvent.setup()
    renderApp('/sectors')

    expect(screen.getByText(/floodgate spine/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /escalating/i }))

    expect(screen.getByText(/glass archive/i)).toBeInTheDocument()
    expect(screen.queryByText(/floodgate spine/i)).not.toBeInTheDocument()
  })

  it('searches sectors by operator-facing text', async () => {
    const user = userEvent.setup()
    renderApp('/sectors')

    await user.type(screen.getByRole('searchbox', { name: /search sectors/i }), 'rook')

    expect(screen.getByText(/transit bloom/i)).toBeInTheDocument()
    expect(screen.queryByText(/glass archive/i)).not.toBeInTheDocument()
  })

  it('shows an empty state when sector search finds nothing', async () => {
    const user = userEvent.setup()
    renderApp('/sectors')

    await user.type(screen.getByRole('searchbox', { name: /search sectors/i }), 'nomatch')

    expect(screen.getByText(/no sectors match that query/i)).toBeInTheDocument()
  })

  it('restores sector watch state from query params', () => {
    renderApp('/sectors?status=critical&q=rook')

    expect(screen.getByRole('searchbox', { name: /search sectors/i })).toHaveValue('rook')
    expect(screen.getByTestId('location-display')).toHaveTextContent(
      '/sectors?status=critical&q=rook'
    )
    expect(screen.getByText(/transit bloom/i)).toBeInTheDocument()
    expect(screen.queryByText(/glass archive/i)).not.toBeInTheDocument()
  })

  it('syncs sector watch filters into the url and clears them from the screen', async () => {
    const user = userEvent.setup()
    renderApp('/sectors')

    await user.click(screen.getByRole('button', { name: /blackout/i }))
    await user.type(screen.getByRole('searchbox', { name: /search sectors/i }), 'rook')

    await waitFor(() => {
      expect(screen.getByTestId('location-display')).toHaveTextContent(/status=critical/)
      expect(screen.getByTestId('location-display')).toHaveTextContent(/q=rook/)
    })

    expect(screen.getByText(/1 sector in view/i)).toBeInTheDocument()
    expect(screen.getByText(/status: blackout \/ search: rook/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /clear filters/i }))

    await waitFor(() => {
      expect(screen.getByTestId('location-display')).toHaveTextContent(/^\/sectors$/)
      expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument()
    })

    expect(screen.getByText(/showing the full containment grid/i)).toBeInTheDocument()
  })

  it('acknowledges a sector from the detail route', async () => {
    const user = userEvent.setup()
    renderApp('/sectors/C-12')

    await user.click(screen.getByRole('button', { name: /acknowledge sector/i }))

    expect(screen.getByText(/acknowledged in command queue/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove acknowledgement/i })).toBeInTheDocument()
  })

  it('shows a not-found detail screen for unknown sectors', () => {
    renderApp('/sectors/UNKNOWN')

    expect(screen.getByRole('heading', { name: /sector not found/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /return to sector watch/i })).toBeInTheDocument()
  })

  it('shows protocol guidance on the timeline route', () => {
    renderApp('/timeline')

    expect(screen.getByRole('heading', { name: /escalation timeline/i })).toBeInTheDocument()
    expect(screen.getByText(/quiet the corridor/i)).toBeInTheDocument()
  })

  it('persists command state to local storage', async () => {
    const user = userEvent.setup()
    renderApp('/sectors/C-12')

    await user.click(screen.getByRole('button', { name: /acknowledge sector/i }))

    const storedState = useIncidentStore.persist
      .getOptions()
      .storage?.getItem('containment-protocol-command-state')

    expect(storedState).toMatchObject({
      state: {
        acknowledgedSectors: ['C-12'],
      },
    })
  })

  it('resets command state from the shell header', async () => {
    const user = userEvent.setup()
    renderApp('/sectors/C-12')

    await user.click(screen.getByRole('button', { name: /acknowledge sector/i }))
    await user.click(screen.getByRole('button', { name: /reset command state/i }))

    expect(screen.getByText(/awaiting acknowledgement from command/i)).toBeInTheDocument()
    expect(screen.queryByText(/acknowledged in command queue/i)).not.toBeInTheDocument()
  })

  it('clears deep-linked sector watch state from the shell header', async () => {
    const user = userEvent.setup()
    renderApp('/sectors?status=critical&q=rook')

    await user.click(screen.getByRole('button', { name: /reset command state/i }))

    await waitFor(() => {
      expect(screen.getByRole('searchbox', { name: /search sectors/i })).toHaveValue('')
      expect(screen.getByTestId('location-display')).toHaveTextContent(/^\/sectors$/)
    })

    expect(screen.getByText(/floodgate spine/i)).toBeInTheDocument()
  })

  it('shows acknowledged sectors inside the command queue', async () => {
    const user = userEvent.setup()
    renderApp('/sectors/C-12')

    await user.click(screen.getByRole('button', { name: /acknowledge sector/i }))
    await user.click(screen.getByRole('link', { name: /back to sector watch/i }))

    const queuePanel = screen
      .getByRole('heading', { name: /acknowledged sectors/i })
      .closest('aside')

    expect(queuePanel).not.toBeNull()
    expect(within(queuePanel!).getByText(/glass archive/i)).toBeInTheDocument()
    expect(within(queuePanel!).getByRole('link', { name: /reopen/i })).toBeInTheDocument()
  })

  it('removes a queued sector directly from sector watch', async () => {
    const user = userEvent.setup()
    renderApp('/sectors/C-12')

    await user.click(screen.getByRole('button', { name: /acknowledge sector/i }))
    await user.click(screen.getByRole('link', { name: /back to sector watch/i }))

    const queuePanel = screen
      .getByRole('heading', { name: /acknowledged sectors/i })
      .closest('aside')

    expect(queuePanel).not.toBeNull()

    await user.click(
      within(queuePanel!).getByRole('button', { name: /remove glass archive from queue/i })
    )

    expect(within(queuePanel!).getByText(/no sectors are queued yet/i)).toBeInTheDocument()
    expect(screen.getByText(/0 sectors acknowledged by command/i)).toBeInTheDocument()
  })

  it('clears the full command queue from sector watch', async () => {
    const user = userEvent.setup()
    useIncidentStore.getState().toggleAcknowledged('C-12')
    useIncidentStore.getState().toggleAcknowledged('D-09')
    renderApp('/sectors')

    const queuePanel = screen
      .getByRole('heading', { name: /acknowledged sectors/i })
      .closest('aside')

    expect(queuePanel).not.toBeNull()
    expect(within(queuePanel!).getByText(/2 sectors queued/i)).toBeInTheDocument()

    await user.click(within(queuePanel!).getByRole('button', { name: /clear queue/i }))

    expect(within(queuePanel!).getByText(/no sectors are queued yet/i)).toBeInTheDocument()
    expect(screen.getByText(/0 sectors acknowledged by command/i)).toBeInTheDocument()
  })
})
