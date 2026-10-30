import '../../test/setup'
import { StrictMode } from 'react'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameStore } from '../../app/store/gameStore'
import { loadGameSave, serializeGameSave } from '../../app/store/saveSystem'
import {
  agencyEstablishmentHandoff,
  dispatchAgencyEstablishment,
} from '../../app/agencyEstablishmentRuntime'
import { createTutorialRuntime } from '../../app/tutorialRuntime'
import { createStartingState } from '../../data/startingState'
import {
  AGENCY_ESTABLISHMENT_BEAT_IDS,
  buildAgencyEstablishmentProjection,
} from '../../domain/agencyEstablishmentProjection'
import { AGENCY_ESTABLISHMENT_TUTORIAL } from '../../domain/agencyEstablishmentTutorial'
import { ensureManagedGameState, getTutorialLifecycle } from '../../domain/gameStateManager'
import type { GameState } from '../../domain/models'
import { AgencyEstablishmentPanel } from './AgencyEstablishmentPanel'
import { projectAgencyEstablishmentView } from './agencyEstablishmentView'

const game = () => useGameStore.getState().game
const lifecycle = () => getTutorialLifecycle(game(), AGENCY_ESTABLISHMENT_TUTORIAL)!
const events = () =>
  game().runtimeState!.ui.debug.eventLog!.filter((entry) => entry.type === 'tutorial.lifecycle')
function advanceTo(index: number) {
  fireEvent.click(screen.getByRole('button', { name: /^Begin briefing/ }))
  for (let beat = 0; beat < index; beat++)
    fireEvent.click(screen.getByRole('button', { name: /^Continue/ }))
}
function production(state: GameState) {
  const copy = JSON.parse(JSON.stringify(state))
  delete copy.runtimeState.tutorials
  copy.runtimeState.ui.debug.eventLog = []
  copy.runtimeState.ui.debug.nextEventSequence = 1
  return copy
}
beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: ensureManagedGameState(createStartingState()) })
})
afterEach(cleanup)

describe('agency establishment flow', () => {
  it('registers one canonical seven-beat sequence and renders one current beat', () => {
    expect(AGENCY_ESTABLISHMENT_TUTORIAL.steps.map((step) => step.id)).toEqual(
      AGENCY_ESTABLISHMENT_BEAT_IDS
    )
    const before = game()
    render(<AgencyEstablishmentPanel />)
    const progress = within(screen.getByRole('list', { name: 'Briefing beats' })).getAllByRole(
      'listitem'
    )
    expect(progress).toHaveLength(7)
    const titles = projectAgencyEstablishmentView(game()).beats.map((beat) => beat.title)
    progress.forEach((item, index) => expect(item).toHaveTextContent(titles[index]))
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(titles[0])
    expect(screen.getByRole('button', { name: 'Begin briefing' })).toBeEnabled()
    expect(game()).toBe(before)
    expect(events()).toEqual([])
  })

  it('progresses in order with stable beat telemetry and one non-routing handoff', () => {
    const onComplete = vi.fn()
    const path = location.pathname
    render(<AgencyEstablishmentPanel onComplete={onComplete} />)
    advanceTo(6)
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Agency activation')
    expect(onComplete).not.toHaveBeenCalled()
    const revision = lifecycle().revision
    const finalId = AGENCY_ESTABLISHMENT_BEAT_IDS[6]
    fireEvent.click(screen.getByRole('button', { name: 'Finish briefing' }))
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'review-the-week', outcome: 'completed', run: 1 })
    )
    expect(
      events()
        .filter((entry) => entry.details?.kind === 'step_entered')
        .map((entry) => entry.details?.stepId)
    ).toEqual(AGENCY_ESTABLISHMENT_BEAT_IDS)
    let stale
    act(() => {
      stale = dispatchAgencyEstablishment('complete', revision, finalId)
    })
    expect(agencyEstablishmentHandoff(stale!)).toBeUndefined()
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(location.pathname).toBe(path)
  })

  it('uses canonical back/skip transitions instead of local step state', () => {
    render(<AgencyEstablishmentPanel />)
    advanceTo(1)
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Initial facility state')
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(lifecycle().cursor).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'Skip beat' }))
    expect(lifecycle().stepStatuses[0]).toBe('skipped')
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Initial facility state')
  })

  it('pauses and resumes through save/load at the same canonical beat', () => {
    const rendered = render(<AgencyEstablishmentPanel />)
    advanceTo(2)
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Briefing paused')
    rendered.unmount()
    useGameStore.setState({ game: loadGameSave(serializeGameSave(game())) })
    render(<AgencyEstablishmentPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Resume briefing' }))
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
      'Opening operational ledger'
    )
    expect(lifecycle()).toMatchObject({ status: 'active', cursor: 2 })
    expect(
      events().filter(
        (entry) =>
          entry.details?.kind === 'step_entered' &&
          entry.details?.stepId === AGENCY_ESTABLISHMENT_BEAT_IDS[0]
      )
    ).toHaveLength(1)
  })

  it('retains an active run across unmount/reload without auto-replaying it', () => {
    const rendered = render(<AgencyEstablishmentPanel />)
    advanceTo(3)
    rendered.unmount()
    const before = lifecycle()
    useGameStore.setState({ game: loadGameSave(serializeGameSave(game())) })
    render(<AgencyEstablishmentPanel />)
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Command identity')
    expect(lifecycle()).toEqual(before)
  })

  it('skips the whole briefing through ordinary step transitions without production changes', () => {
    const before = production(game())
    const onComplete = vi.fn()
    render(<AgencyEstablishmentPanel onComplete={onComplete} />)
    fireEvent.click(screen.getByRole('button', { name: 'Skip briefing' }))
    expect(lifecycle().status).toBe('skipped')
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'review-the-week', outcome: 'skipped' })
    )
    expect(
      events()
        .filter((entry) => entry.details?.kind === 'skipped' && entry.details?.stepId)
        .map((entry) => entry.details?.stepId)
    ).toEqual(AGENCY_ESTABLISHMENT_BEAT_IDS)
    expect(events().some((entry) => entry.details?.kind === 'failed')).toBe(false)
    expect(production(game())).toEqual(before)
  })

  it('skips remaining beats without treating an active run as a failed start', () => {
    const onComplete = vi.fn()
    render(<AgencyEstablishmentPanel onComplete={onComplete} />)
    advanceTo(2)
    fireEvent.click(screen.getByRole('button', { name: 'Skip remaining beats' }))
    expect(lifecycle().status).toBe('completed')
    expect(lifecycle().stepStatuses.filter((status) => status === 'skipped')).toHaveLength(5)
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(events().some((entry) => entry.details?.kind === 'failed')).toBe(false)
  })

  it('replays current projection facts without campaign initialization or duplicate handoffs', () => {
    const onComplete = vi.fn()
    render(<AgencyEstablishmentPanel onComplete={onComplete} />)
    advanceTo(6)
    fireEvent.click(screen.getByRole('button', { name: 'Finish briefing' }))
    const ledger = game().campaignLedger
    if (!ledger) throw new Error('Expected campaign ledger')
    act(() =>
      useGameStore.setState({
        game: {
          ...game(),
          campaignLedger: {
            ...ledger,
            profile: { ...ledger.profile, majorHookSummary: 'Current replay hook.' },
          },
        },
      })
    )
    const before = production(game())
    fireEvent.click(screen.getByRole('button', { name: 'Replay briefing' }))
    expect(lifecycle()).toMatchObject({ status: 'active', run: 2, cursor: 0 })
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(production(game())).toEqual(before)
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Doctrine and setting')
    expect(screen.getByText('Current replay hook.')).toBeVisible()
  })

  it('does not auto-start or re-emit persisted completion under StrictMode/remount', () => {
    const onComplete = vi.fn()
    const rendered = render(
      <StrictMode>
        <AgencyEstablishmentPanel onComplete={onComplete} />
      </StrictMode>
    )
    expect(lifecycle().status).toBe('not_started')
    advanceTo(6)
    fireEvent.click(screen.getByRole('button', { name: 'Finish briefing' }))
    expect(onComplete).toHaveBeenCalledTimes(1)
    rendered.unmount()
    useGameStore.setState({ game: loadGameSave(serializeGameSave(game())) })
    render(
      <StrictMode>
        <AgencyEstablishmentPanel onComplete={onComplete} />
      </StrictMode>
    )
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Briefing complete')
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('uses authoritative campaign identity/copy and does not synthesize an anonymous persona', () => {
    const current = game()
    const ledger = current.campaignLedger
    if (!ledger) throw new Error('Expected campaign ledger')
    const changed = {
      ...current,
      campaignLedger: {
        ...ledger,
        profile: {
          ...ledger.profile,
          organizationName: 'Public Agency',
          majorHookSummary: 'An authoritative changed hook.',
        },
        commandIdentity: {
          ...ledger.commandIdentity,
          mode: 'custom' as const,
          displayName: 'Director Public',
          title: 'Director',
          pronouns: 'they/them',
          biography: 'Public biography.',
        },
      },
    }
    const view = projectAgencyEstablishmentView(changed)
    expect(view.beats[0].paragraphs).toContain(
      buildAgencyEstablishmentProjection(changed).doctrine.majorHookSummary
    )
    expect(view.beats[3].paragraphs).toContain('Director Public')
    expect(view.beats[3].facts).toContainEqual(['Organization', 'Public Agency'])
    expect(projectAgencyEstablishmentView(current).beats[3].paragraphs).toHaveLength(1)
  })

  it('preserves absent optional capacity without manufacturing zero', () => {
    const current = game()
    const changed = {
      ...current,
      agency: {
        ...current.agency!,
        supportAvailable: undefined,
        maintenanceSpecialistsAvailable: undefined,
      },
    }
    const view = projectAgencyEstablishmentView(changed)
    expect(view.beats[1].facts).toContainEqual(['Support available', 'Unavailable'])
    expect(view.beats[1].facts).toContainEqual(['Maintenance specialists', 'Unavailable'])
    expect(
      projectAgencyEstablishmentView({
        ...changed,
        agency: { ...changed.agency, supportAvailable: 0 },
      }).beats[1].facts
    ).toContainEqual(['Support available', '0'])
  })

  it('handles a null dossier without a tutorial mission or deadlock', () => {
    useGameStore.setState({ game: { ...game(), cases: {} } })
    render(<AgencyEstablishmentPanel />)
    advanceTo(5)
    expect(screen.getByText('No open dossier is available.')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('button', { name: 'Finish briefing' })).toBeEnabled()
    expect(game().cases).toEqual({})
  })

  it('renders only the bounded dossier/routing projection, with no extra case payload', () => {
    const current = game()
    const first = Object.values(current.cases)[0]
    expect(first).toBeDefined()
    Object.assign(first, {
      description: 'PRIVATE_CASE_PAYLOAD',
      hiddenTruth: 'PRIVATE_CASE_PAYLOAD',
    })
    const projection = buildAgencyEstablishmentProjection(current)
    const view = projectAgencyEstablishmentView(current)
    expect(view.beats[5].explanation).toEqual(projection.firstDossier?.routingExplanation)
    expect(JSON.stringify(view)).not.toContain('PRIVATE_CASE_PAYLOAD')
    render(<AgencyEstablishmentPanel />)
    advanceTo(5)
    expect(screen.queryByText('PRIVATE_CASE_PAYLOAD')).not.toBeInTheDocument()
    if (projection.firstDossier)
      expect(screen.getByRole('region', { name: 'Current routing explanation' })).toHaveTextContent(
        projection.firstDossier.routingExplanation.summary
      )
  })

  it('preserves meaning for reduced motion, non-hover, screen-reader and text scaling contexts', () => {
    const ordinary = projectAgencyEstablishmentView(game(), { reducedMotion: false, hover: true })
    const accessible = projectAgencyEstablishmentView(game(), {
      reducedMotion: true,
      hover: false,
      screenReader: true,
      textScale: 2,
    })
    expect(accessible.guidance?.semanticText).toEqual(ordinary.guidance?.semanticText)
    render(<AgencyEstablishmentPanel accessibility={{ reducedMotion: true, textScale: 2 }} />)
    const panel = screen.getByRole('article')
    expect(panel).toHaveAttribute('data-reduced-motion', 'true')
    expect(panel.style.fontSize).toBe('2em')
    expect(screen.getByRole('heading', { level: 3 })).toHaveFocus()
  })

  it('consumes current binding labels and ordinary keyboard button activation', async () => {
    const user = userEvent.setup()
    let binding = 'Current confirm'
    const props = {
      accessibility: { inputMethod: 'keyboard' as const, supportedInputs: ['keyboard' as const] },
      resolveBinding: () => ({ label: binding }),
    }
    const rendered = render(<AgencyEstablishmentPanel {...props} />)
    const begin = screen.getByRole('button', { name: 'Begin briefing (Current confirm)' })
    begin.focus()
    await user.keyboard('{Enter}')
    expect(lifecycle().status).toBe('active')
    binding = 'Remapped confirm'
    rendered.rerender(<AgencyEstablishmentPanel {...props} />)
    const next = screen.getByRole('button', { name: 'Continue (Remapped confirm)' })
    next.focus()
    await user.keyboard('{Enter}')
    expect(lifecycle().cursor).toBe(1)
  })

  it('honors persisted suppression and restores without bypassing lifecycle', () => {
    dispatchAgencyEstablishment('suppress', 0)
    render(<AgencyEstablishmentPanel />)
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Briefing hidden')
    fireEvent.click(screen.getByRole('button', { name: 'Restore briefing' }))
    expect(lifecycle().status).toBe('not_started')
    expect(screen.getByRole('button', { name: 'Begin briefing' })).toBeEnabled()
  })

  it('does not turn completion from an unrelated tutorial into opening handoff', () => {
    const other = createTutorialRuntime([
      {
        id: 'other',
        version: 1,
        kind: 'contextual',
        allowBack: false,
        replayable: false,
        steps: [{ id: 'one' }],
      },
    ])
    other.dispatch('other', { type: 'start', expectedRevision: 0 })
    const completed = other.dispatch('other', {
      type: 'complete',
      expectedRevision: 1,
      stepId: 'one',
    })
    expect(agencyEstablishmentHandoff(completed)).toBeUndefined()
  })
})
