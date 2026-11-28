import '../test/setup'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { createStartingState } from '../data/startingState'
import App from './App'
import { dispatchInputAction } from './inputRuntime'
import { APP_ROUTES } from './routes'
import { useGameStore } from './store/gameStore'

const storageKey = useGameStore.persist.getOptions().name!

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  )
}

function findOperationsDesk() {
  return screen.findByRole('region', { name: 'Operations hub overview' }, { timeout: 5000 })
}

beforeEach(() => {
  useGameStore.setState({ game: createStartingState(), gameReplacementRevision: 0 })
  useGameStore.persist.clearStorage()
})

describe('local Main Menu', () => {
  it('continues a confirmed active campaign through the canonical landing', async () => {
    useGameStore.getState().setSeed(415)
    useGameStore.getState().advanceWeek()
    const { game, gameReplacementRevision } = useGameStore.getState()
    const user = userEvent.setup()
    renderApp(APP_ROUTES.mainMenu)

    expect(screen.getByRole('heading', { name: 'Main Menu' })).toHaveFocus()
    expect(screen.queryByRole('banner', { name: 'Shell status bar' })).not.toBeInTheDocument()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(await findOperationsDesk()).toBeVisible()
    expect(screen.getByRole('main')).toHaveFocus()
    expect(useGameStore.getState().game).toMatchObject({ week: game.week, rngSeed: 415 })
    expect(useGameStore.getState().game.reports).toBe(game.reports)
    expect(useGameStore.getState().gameReplacementRevision).toBe(gameReplacementRevision)
  })

  it('preserves a loaded campaign when hydration changed its persisted projection', async () => {
    useGameStore.getState().setSeed(415)
    useGameStore.getState().advanceWeek()
    const raw = localStorage.getItem(storageKey)
    await useGameStore.persist.rehydrate()
    const state = useGameStore.getState()

    renderApp(APP_ROUTES.mainMenu)

    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
    expect(useGameStore.getState()).toBe(state)
    expect(localStorage.getItem(storageKey)).toBe(raw)
  })

  it.each([null, 'malformed save', '{"state":{"game":{}},"version":7}'])(
    'keeps unconfirmed campaign data untouched (%s)',
    async (raw) => {
      if (raw !== null) localStorage.setItem(storageKey, raw)
      await useGameStore.persist.rehydrate()
      const state = useGameStore.getState()
      const user = userEvent.setup()
      renderApp(APP_ROUTES.mainMenu)

      const button = screen.getByRole('button', { name: 'Continue' })
      expect(button).toBeDisabled()
      expect(screen.getByText('No campaign is ready to continue.')).toBeVisible()
      await user.click(button)
      expect(screen.queryByText('A saved campaign could not be confirmed.')).not.toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Main Menu' })).toBeVisible()
      expect(useGameStore.getState()).toBe(state)
      expect(localStorage.getItem(storageKey)).toBe(raw)
    }
  )

  it('rechecks a save that changed after the menu opened', async () => {
    useGameStore.getState().setSeed(415)
    const state = useGameStore.getState()
    const user = userEvent.setup()
    renderApp(APP_ROUTES.mainMenu)

    const button = screen.getByRole('button', { name: 'Continue' })
    expect(button).toBeEnabled()
    expect(screen.queryByText('A saved campaign could not be confirmed.')).not.toBeInTheDocument()
    await user.tab()
    expect(button).toHaveFocus()
    localStorage.setItem(storageKey, 'changed in another tab')
    await user.keyboard('{Enter}')
    expect(button).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('A saved campaign could not be confirmed.')
    expect(screen.getByRole('heading', { name: 'Main Menu' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Settings' })).toHaveFocus()
    expect(useGameStore.getState()).toBe(state)
    expect(localStorage.getItem(storageKey)).toBe('changed in another tab')
  })

  it('retains the campaign and skips the menu in campaign history on return', async () => {
    const user = userEvent.setup()
    renderApp(APP_ROUTES.operationsDesk)
    await findOperationsDesk()
    const primaryNav = within(screen.getByRole('navigation', { name: 'Primary operations' }))
    await user.click(primaryNav.getByRole('link', { name: 'Cases' }))
    const casesHeading = { name: 'Cases', level: 1 }
    expect(screen.getByRole('heading', casesHeading)).toBeVisible()
    await user.click(primaryNav.getByRole('link', { name: 'Operations Desk' }))
    await findOperationsDesk()
    const campaign = useGameStore.getState().game
    const persisted = localStorage.getItem(storageKey)

    await user.click(screen.getByRole('link', { name: 'Main Menu' }))
    expect(screen.getByRole('heading', { name: 'Main Menu' })).toHaveFocus()
    expect(dispatchInputAction('navigation.back')).toBe(false)
    expect(useGameStore.getState().game).toBe(campaign)
    expect(localStorage.getItem(storageKey)).toBe(persisted)

    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await findOperationsDesk()).toBeVisible()
    expect(screen.getByRole('main')).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled()
    expect(useGameStore.getState().game).toBe(campaign)
    expect(localStorage.getItem(storageKey)).toBe(persisted)

    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.queryByRole('heading', { name: 'Main Menu' })).not.toBeInTheDocument()
    expect(await findOperationsDesk()).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('heading', casesHeading)).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Forward' }))
    expect(await findOperationsDesk()).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Forward' }))
    expect(await findOperationsDesk()).toBeVisible()
    expect(screen.getByRole('button', { name: 'Forward' })).toBeDisabled()
  })

  it('opens the shared Settings dialog from the menu without changing campaign state', async () => {
    const user = userEvent.setup()
    renderApp(APP_ROUTES.mainMenu)
    const settings = screen.getByRole('button', { name: 'Settings' })
    const dialog = screen.getByText('Close settings').closest('dialog')!
    const open = vi.fn(() => dialog.setAttribute('open', ''))
    Object.defineProperty(dialog, 'showModal', { value: open })
    const state = useGameStore.getState()

    await user.tab()
    expect(settings).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(open).toHaveBeenCalledOnce()
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Close settings' })).toBeVisible()
    expect(useGameStore.getState()).toBe(state)
    expect(localStorage.getItem(storageKey)).toBeNull()
  })

  it('opens Credits and only accepts the dismiss action while its dialog has focus', async () => {
    useGameStore.getState().setSeed(415)
    const state = useGameStore.getState()
    const persisted = localStorage.getItem(storageKey)
    const user = userEvent.setup()
    renderApp(APP_ROUTES.mainMenu)

    const credits = screen.getByRole('button', { name: 'Credits' })
    const closeCredits = screen.getByText('Close credits')
    const dialog = closeCredits.closest('dialog')!
    const open = vi.fn(() => dialog.setAttribute('open', ''))
    const close = vi.fn(() => dialog.removeAttribute('open'))
    Object.defineProperty(dialog, 'showModal', { value: open })
    Object.defineProperty(dialog, 'close', { value: close })

    expect(dispatchInputAction('modal.dismiss')).toBe(false)
    await user.click(credits)
    expect(open).toHaveBeenCalledOnce()
    expect(screen.getByRole('dialog', { name: 'Credits' })).toBeVisible()
    expect(dispatchInputAction('modal.dismiss')).toBe(false)
    expect(close).not.toHaveBeenCalled()

    closeCredits.focus()
    expect(dispatchInputAction('modal.dismiss')).toBe(true)
    expect(close).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog', { name: 'Credits' })).not.toBeInTheDocument()
    expect(useGameStore.getState()).toBe(state)
    expect(localStorage.getItem(storageKey)).toBe(persisted)
  })

  it('keeps the existing recovery screen ahead of the menu', async () => {
    const { game } = useGameStore.getState()
    const [caseId, currentCase] = Object.entries(game.cases)[0]
    const invalid = {
      ...game,
      cases: {
        ...game.cases,
        [caseId]: { ...currentCase, onUnresolved: { ...currentCase.onUnresolved, stageDelta: -1 } },
      },
    }
    useGameStore.setState({ game: invalid })
    const raw = localStorage.getItem(storageKey)
    await act(async () => useGameStore.persist.rehydrate())

    renderApp(APP_ROUTES.mainMenu)
    expect(screen.getByRole('heading', { name: 'Saved campaign unavailable' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Main Menu' })).not.toBeInTheDocument()
    expect(localStorage.getItem(storageKey)).toBe(raw)
  })
})
